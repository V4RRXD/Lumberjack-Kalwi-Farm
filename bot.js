const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalNear, GoalBlock } = require('mineflayer-pathfinder').goals;
const autoEat = require('mineflayer-auto-eat');

const bot = mineflayer.createBot({
  host: 'kalwi.id',
  port: 25565,
  username: 'V4RRXDD',
  version: false
});

let isLoggingIn = true;
let isInLobby = false;
let isTreeCutting = false;
let currentTargetTree = null;

bot.loadPlugin(pathfinder);
bot.loadPlugin(autoEat);

bot.once('spawn', () => {
  console.log('Bot masuk ke server');
  setTimeout(() => {
    bot.chat('/login Rio13245');
    console.log('Mengirim /login');
  }, 2000);
});

bot.on('message', (message) => {
  const msg = message.toString().toLowerCase();
  
  if (msg.includes('login success') || msg.includes('berhasil login') || msg.includes('welcome')) {
    console.log('Login berhasil');
    isLoggingIn = false;
    setTimeout(() => checkLobby(), 3000);
  }
  
  if (msg.includes('anda mati') || msg.includes('you died') || msg.includes('killed')) {
    console.log('Bot mati, menjalankan /back');
    setTimeout(() => {
      bot.chat('/back');
      setTimeout(() => startTreeCutting(), 3000);
    }, 2000);
  }
  
  if (msg.includes('tidak memiliki izin') || msg.includes('wrong password')) {
    console.log('Password error');
  }
});

function checkLobby() {
  const compass = bot.inventory.items.find(item => item.name.includes('compass'));
  if (compass) {
    console.log('Compass ditemukan');
    equipAndUseCompass(compass);
  } else {
    console.log('Compass tidak ditemukan di inventory');
    setTimeout(checkLobby, 2000);
  }
}

function equipAndUseCompass(compass) {
  bot.equip(compass, 'hand').then(() => {
    console.log('Compass di equipt');
    setTimeout(() => {
      bot.activateItem();
      console.log('Klik kanan compass');
      setTimeout(() => selectSurvival(), 1500);
    }, 500);
  }).catch(err => console.log('Equip error:', err));
}

function selectSurvival() {
  const survivalBlock = bot.findBlock({
    matching: (block) => block.name.includes('grass_block') || block.name.includes('grass'),
    maxDistance: 5
  });
  
  if (survivalBlock) {
    const survivalName = getSurvivalSignText(survivalBlock);
    if (survivalName && survivalName.includes('Survival #1')) {
      bot.lookAt(survivalBlock.position).then(() => {
        bot.attack(survivalBlock);
        console.log('Klik Survival #1');
        setTimeout(() => {
          isInLobby = false;
          startTreeCutting();
        }, 3000);
      });
    } else {
      findSurvivalSign();
    }
  } else {
    findSurvivalSign();
  }
}

function findSurvivalSign() {
  const sign = bot.findBlock({
    matching: (block) => block.name.includes('sign') || block.name.includes('wall_sign'),
    maxDistance: 10
  });
  
  if (sign) {
    bot.lookAt(sign.position).then(() => {
      bot.attack(sign);
      setTimeout(() => selectSurvival(), 1000);
    });
  } else {
    console.log('Mencari Survival #1...');
    bot.chat('/server Survival');
    setTimeout(() => selectSurvival(), 3000);
  }
}

function getSurvivalSignText(block) {
  return block.signText ? block.signText.text : null;
}

function startTreeCutting() {
  if (isTreeCutting) return;
  isTreeCutting = true;
  console.log('Mulai mencari pohon');
  findAndCutTree();
}

function findAndCutTree() {
  const tree = bot.findBlock({
    matching: (block) => {
      return block.name.includes('log') || 
             block.name.includes('wood') ||
             block.name === 'oak_log' ||
             block.name === 'spruce_log' ||
             block.name === 'birch_log' ||
             block.name === 'jungle_log' ||
             block.name === 'acacia_log' ||
             block.name === 'dark_oak_log' ||
             block.name === 'mangrove_log' ||
             block.name === 'cherry_log';
    },
    maxDistance: 32
  });
  
  if (tree) {
    currentTargetTree = tree;
    cutTree(tree);
  } else {
    console.log('Tidak ada pohon, mencari...');
    moveToNewArea();
  }
}

function cutTree(tree) {
  const axe = bot.inventory.items.find(item => 
    item.name.includes('axe') || item.name.includes('ax')
  );
  
  if (!axe) {
    console.log('Tidak ada kapak');
    return;
  }
  
  bot.equip(axe, 'hand').then(() => {
    const goal = new GoalNear(tree.position.x, tree.position.y, tree.position.z, 1);
    bot.pathfinder.setGoal(goal);
    
    const checkInterval = setInterval(() => {
      const distance = bot.entity.position.distanceTo(tree.position);
      
      if (distance < 3) {
        clearInterval(checkInterval);
        mineTree(tree);
      }
    }, 500);
    
    setTimeout(() => clearInterval(checkInterval), 10000);
  }).catch(err => console.log('Equip axe error:', err));
}

function mineTree(tree) {
  bot.lookAt(tree.position).then(() => {
    bot.dig(tree, (err) => {
      if (err) {
        console.log('Gagal menebang:', err);
        findAndCutTree();
        return;
      }
      
      console.log('Pohon ditebang');
      removeNearbyLeaves(tree.position);
      
      setTimeout(() => {
        findAndCutTree();
      }, 500);
    });
  });
}

function removeNearbyLeaves(centerPos) {
  const leaves = bot.findBlocks({
    matching: (block) => block.name.includes('leaves') || block.name.includes('leaf'),
    maxDistance: 5,
    count: 50
  });
  
  leaves.forEach(leafPos => {
    const block = bot.blockAt(leafPos);
    if (block && block.name.includes('leaves')) {
      setTimeout(() => {
        bot.dig(block, (err) => {
          if (!err) console.log('Daun dihancurkan');
        });
      }, Math.random() * 500);
    }
  });
}

function moveToNewArea() {
  const randomX = Math.floor(Math.random() * 100) - 50;
  const randomZ = Math.floor(Math.random() * 100) - 50;
  const newPos = bot.entity.position.offset(randomX, 0, randomZ);
  
  const goal = new GoalNear(newPos.x, newPos.y, newPos.z, 5);
  bot.pathfinder.setGoal(goal);
  
  setTimeout(() => {
    findAndCutTree();
  }, 5000);
}

bot.on('health', () => {
  const food = bot.food;
  if (food <= 18) {
    console.log('Lapar, auto makan aktif');
  }
});

bot.on('entityHurt', (entity) => {
  if (entity === bot.entity) {
    console.log('Bot terkena damage');
  }
});

bot.on('death', () => {
  isTreeCutting = false;
  console.log('Bot mati, menunggu respawn');
});

bot.on('kicked', (reason) => {
  console.log('Bot dikick:', reason);
  setTimeout(() => process.exit(1), 1000);
});

bot.on('error', (err) => {
  console.log('Error:', err);
});

bot.on('end', () => {
  console.log('Koneksi putus, reconnect dalam 5 detik');
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});

console.log('Bot Minecraft dimulai');
