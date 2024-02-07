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

function preload ()
{
    // завантаження об'єктів у гру
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.spritesheet('dude', 
        'assets/dude.png',
        { frameWidth: 32, frameHeight: 48 }
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
        frames: [ { key: 'dude', frame: 4 } ],
        frameRate: 20
    });

    // анімація для руху вправо
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

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

    scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' }); // додати текст до текстової змінної очків

    // бомби
    bombs = this.physics.add.group();

    this.physics.add.collider(bombs, platforms);

    this.physics.add.collider(player, bombs, hitBomb, null, this);
}

function update ()
{
    if (cursors.left.isDown) // якщо натиснута стрілка вліво
    {
        player.setVelocityX(-160); // йти вліво

        player.anims.play('left', true); // грати анімацію руху вліво
    }
    else if (cursors.right.isDown) // якщо натиснута стрілка вправо
    {
        player.setVelocityX(160); // йти вправо

        player.anims.play('right', true); // грати анімацію руху вправо
    }
    else // якщо не натиснута стрілка вліво чи вправо
    {
        player.setVelocityX(0); // зупинитись

        player.anims.play('turn'); // грати анімацію стояння
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
    scoreText.setText('Score: ' + score); // оновити

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
}

// коли гравець зіштовхнувся з бомбою
function hitBomb (player, bomb)
{
    this.physics.pause(); // зупинити гру

    player.setTint(0xff0000); // замалювати гравця червоним кольором

    player.anims.play('turn');

    gameOver = true;
}