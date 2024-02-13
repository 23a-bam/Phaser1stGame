var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    // для this.physics
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

var score = 0; // кількість очків
var scoreText; // текстова змінна для очків
var timer = 0; // *100 мс
var timerText; // текстова змінна для таймера
var timerOn = false; // показує, чи увімкнений таймер, що вмикається після першої зібраної зірки

var highScore = 0; // максимальна кількість очок (high score) для оптимізації
var time120 = 0;
var time250 = 0;
var time500 = 0; // змінні, що зберігають час проходження (*100 мс)

function preload ()
{
    // завантаження об'єктів у гру
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/tile.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.spritesheet('dude', 
        'assets/knight.png',
        { frameWidth: 117, frameHeight: 141 }
    );
}

function create ()
{
    // додає небо, починаючи з точки (0, 0)
    this.add.image(0, 0, 'sky').setOrigin(0, 0);

    // платформи (на фіксованих позиціях)
    platforms = this.physics.add.staticGroup();

    platforms.create(400, 568, 'ground').setScale(2).refreshBody();

    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');

    // гравець
    player = this.physics.add.sprite(100, 450, 'dude');

    player.setBounce(0.2);
    player.setScale(0.8);
    player.setCollideWorldBounds(true);

    // анімація для руху вліво
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1 // повторювати анімацію
    });

    // анімація для стояння
    this.anims.create({
        key: 'turn',
        frames: [ { key: 'dude', frame: 2 } ],
        frameRate: 20
    });

    /* анімація для руху вправо
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    }); */

    // гравітація для гравця
    player.body.setGravityY(300);
    // додає зіткнення гравця з платформами
    this.physics.add.collider(player, platforms);

    // реєструє стрілки вліво, вправо, вгору, вниз
    cursors = this.input.keyboard.createCursorKeys();

    // зірки
    stars = this.physics.add.group({ // динамічна група
        key: 'star',
        repeat: 11, // повторити ще 11 раз (всього 12)
        setXY: { x: 12, y: 0, stepX: 70 } // задати початкову позицію зірок
    });
    
    stars.children.iterate(function (child) { // для кожної зірки у групі
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8)); // стрибучість зірок задати випадкове від 0.4 (40%) до 0.8 (80%)
    });

    // зіткнення зірок з платформами
    this.physics.add.collider(stars, platforms);

    // перевірка, чи дотикається зірка до гравця
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // бомби
    bombs = this.physics.add.group();

    this.physics.add.collider(bombs, platforms);

    this.physics.add.collider(player, bombs, hitBomb, null, this);

    scoreText = this.add.text(16, 16, 'Очок: 0', { fontSize: '32px', fill: '#000' }); // додати текст до текстової змінної очків
    timerText = this.add.text(16, 50, 'Час: 00:00.0', { fontSize: '32px', fill: '#000' }); // додати початковий текст до таймера

    const timerFunction = setInterval(function() {
        if (!timerOn) {return;} // якщо таймер вимкнено, нічого не робити
        timer+=1;
        timerText.setText("Час: " + formatTimerText(timer));
      }, 95); // повторювати кожні 95 мс (-5 мс для владнання похибки)

    fetchLeaderboard();
}

function update ()
{
    if (cursors.left.isDown) // якщо натиснута стрілка вліво
    {
        player.setVelocityX(-160); // йти вліво
        player.anims.play('left', true);
        player.flipX = true; // повернути вліво
    }
    else if (cursors.right.isDown) // якщо натиснута стрілка вправо
    {
        player.setVelocityX(160); // йти вправо
        player.anims.play('left', true); // грати анімацію руху вправо
        player.flipX = false; // повернути вправо
    }
    else // якщо не натиснута стрілка вліво чи вправо
    {
        player.setVelocityX(0); // зупинитись
        player.anims.play('turn'); // грати анімацію стояння
        // player.flipX = false;
    }

    if (cursors.up.isDown && player.body.touching.down)
    {
        // стрибнути, якщо натиснута стрілка вгору і гравець торкається землі
        player.setVelocityY(-490);
    }
}

// коли гравець отримав зірку
function collectStar (player, star)
{
    star.disableBody(true, true); // видалити зірку

    score += 10; // додати 10 очків
    scoreText.setText('Очок: ' + score); // оновити
    timerOn = true; // увімкнути таймер, якщо він ще вимкнений

    if (stars.countActive(true) === 0) // якщо немає більше зірок
    {
        // перезавантажити усі зірки
        stars.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true, true);
        });

        // обрати x в протилежній частині екрану від гравця, випадково
        var x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);

        // створити одну бомбу
        var bomb = bombs.create(x, 16, 'bomb');
        bomb.setBounce(1); // максимальна стрибучість
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20); // з випадковою швидкістю

        // коли усі зірки знову зібрані, додає ще 1 бомбу, і т.д, даючи можливість зібрати ще більше очок
    }

    let update = false; // позначає, чи потрібно оновити лідерборд (щоб не оновлювати багато разів)
    if (score > highScore) {
        highScore = score;
        update = true;
    }
    if (score == 120 && (timer < time120 || time120 == 0)) {
        time120 = timer;
        update = true;
    }
    if (score == 250 && (timer < time250 || time250 == 0)) {
        time250 = timer;
        update = true;
    }
    if (score == 500 && (timer < time500 || time500 == 0)) {
        time500 = timer;
        update = true;
    }
    if (update) {
        updateLeaderboard(new Array(highScore, time120, time250, time500));
    }
}

// коли гравець зіштовхнувся з бомбою
function hitBomb (player, bomb)
{
    this.physics.pause(); // зупинити гру

    player.setTint(0xff0000); // замалювати гравця червоним кольором

    player.anims.play('turn');

    timerOn = false; // вимкнути таймер

    saveCookie(new Array(highScore, time120, time250, time500)); // зберегти cookie з даними лідерборду

    gameOver = true;
}

function formatTimerText(time)
{
    // розраховує мілісекунди * 100 (децисекунди), секунди й хвилини
    let ms = time % 10; // *100 мс
    let s = Math.floor((time / 10) % 60);
    let min = Math.floor(time / 600);
    // якщо кількість секунд і хвилин одноцифрова, додати на початку 0
    let sText = s < 10 ? "0" + s : "" + s;
    let mText = min < 10 ? "0" + min : "" + min;
    // відформатовує текст і повертає
    return mText + ":" + sText + "." + ms;
}

function fetchLeaderboard()
{
    let cookies = document.cookie;
    if (cookies == "") {return;} // якщо не збережено, повернути
    // cookie має вигляд data=370 156 400 0
    // по черзі: очки, час до 120, час до 250, час до 500
    const data = cookies.split("=")[1].split(" "); // поділити по коміркам по черзі

    // окремо задати змінні
    highScore = data[0];
    time120 = data[1];
    time250 = data[2];
    time500 = data[3];

    updateLeaderboard(data);
}

function updateLeaderboard(data)
{
    // винести дані комірок на лідерборд
    document.getElementById("highscore").innerHTML = data[0];
    document.getElementById("time120").innerHTML = formatTimerText(data[1]);
    document.getElementById("time250").innerHTML = formatTimerText(data[2]);
    document.getElementById("time500").innerHTML = formatTimerText(data[3]);
}

function saveCookie(data)
{
    // задати вміст cookie
    str = data[0] +  " " + data[1] + " " + data[2] + " " + data[3];
    // зберегти cookie
    document.cookie = "data=" + str + "; expires=Thu, 12 Feb 2026 12:00:00 UTC";
}