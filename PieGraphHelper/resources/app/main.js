const { killServers } = require('./index.js');


process.on("SIGINT", () => {
  console.log('sig')
  killServers();
});
