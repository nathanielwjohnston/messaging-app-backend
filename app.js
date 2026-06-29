import "dotenv/config";

import express from "express";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;

app.listen(port, (error) => {
  if (error) throw error;
  console.log(`Listening on port ${port}`);
});
