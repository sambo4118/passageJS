const server = require("server");

const port = Number(process.env.PORT) || 4173;

server({
  port,
  public: ".",
})
  .then(() => {
    console.log(`Local server running at http://localhost:${port}/`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
