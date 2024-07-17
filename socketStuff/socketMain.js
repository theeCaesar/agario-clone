//Where all socket will go
const io = require("../servers").io;
const app = require("../servers").app;
const checkForOrbCollisions =
  require("./checkCollisions").checkForOrbCollisions;
const checkForPlayerCollisions =
  require("./checkCollisions").checkForPlayerCollisions;

const Player = require("./classes/Player");
const PlayerConfig = require("./classes/PlayerConfig");
const PlayerData = require("./classes/PlayerData");
const Orb = require("./classes/Orb");

//frist ill make an orbs array that will host all orbs.
//and every time one is absorb the server will make a new one
const orbs = [];
const settings = {
  defaultNumberOfOrbs: 5000, //number of orbs on the map
  defaultSpeed: 10, //player speed
  defaultSize: 6, //default player speed
  defaultZoom: 1.5, // as the player gets bigger, zoom needs to go out
  worldWidth: 5000,
  worldHeight: 5000,
  defaultGenericOrbSize: 5,
};
const players = [];
const playersForUsers = [];
let tickTockInterval;

initGame();

io.on("connect", (socket) => {
  let player = {};
  socket.on("init", (playerObj, ackCallback) => {
    if (players.length === 0) {
      //Start tick-tocking
      //tick-tock - issue an event 30 times per second
      tickTockInterval = setInterval(() => {
        io.to("game").emit("tick", playersForUsers);
      }, 33);
    }

    socket.join("game");
    const playerName = playerObj.playerName;
    const playerConfig = new PlayerConfig(settings); // data specific to this player that NOT everyone needs to know
    const playerData = new PlayerData(playerName, settings); // data specific to this player that everyone needs to know
    player = new Player(socket.id, playerConfig, playerData);
    players.push(player); //only the server use this
    playersForUsers.push({ playerData });

    ackCallback({ orbs, indexInPlayers: playersForUsers.length - 1 });
  });

  socket.on("tock", (data) => {
    if (!player.playerConfig) {
      return;
    }
    speed = player.playerConfig.speed;
    const xV = (player.playerConfig.xVector = data.xVector);
    const yV = (player.playerConfig.yVector = data.yVector);

    //if player can move in the x, move
    if (
      (player.playerData.locX > 5 && xV < 0) ||
      (player.playerData.locX < settings.worldWidth && xV > 0)
    ) {
      player.playerData.locX += speed * xV;
    }
    //if player can move in the y, move
    if (
      (player.playerData.locY > 5 && yV > 0) ||
      (player.playerData.locY < settings.worldHeight && yV < 0)
    ) {
      player.playerData.locY -= speed * yV;
    }

    //check the player if he hit orbs
    const capturedOrbI = checkForOrbCollisions(
      player.playerData,
      player.playerConfig,
      orbs,
      settings
    );
    if (capturedOrbI !== null) {
      //remove the orb that needs to be replaced
      //add a new Orb
      orbs.splice(capturedOrbI, 1, new Orb(settings));

      //update the clients with the new orb
      const orbData = {
        capturedOrbI,
        newOrb: orbs[capturedOrbI],
      };
      io.to("game").emit("orbSwitch", orbData);
      // updateLeaderBoard because someone just scored
      io.to("game").emit("updateLeaderBoard", getLeaderBoard());
    }

    //player collisions with a player
    const absorbData = checkForPlayerCollisions(
      player.playerData,
      player.playerConfig,
      players,
      playersForUsers,
      socket.id
    );
    if (absorbData) {
      io.to("game").emit("playerAbsorbed", absorbData);
      io.to("game").emit("updateLeaderBoard", getLeaderBoard());
    }
  });

  socket.on("disconnect", (reason) => {
    // find the player with socketId
    //delete that player out
    for (let i = 0; i < players.length; i++) {
      if (players[i].socketId === player.socketId) {
        players.splice(i, 1, {});
        playersForUsers.splice(i, 1, {});
        break;
      }
    }
    //check if players is empty If so stop
    if (players.length === 0) {
      clearInterval(tickTockInterval);
    }
  });
});

function initGame() {
  for (let i = 0; i < settings.defaultNumberOfOrbs; i++) {
    orbs.push(new Orb(settings));
  }
}

function getLeaderBoard() {
  const leaderBoardArray = players.map((curPlayer) => {
    if (curPlayer.playerData) {
      return {
        name: curPlayer.playerData.name,
        score: curPlayer.playerData.score,
      };
    } else {
      return {};
    }
  });
  return leaderBoardArray;
}
