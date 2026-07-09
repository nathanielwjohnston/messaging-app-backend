// Separate file to allow for exporting create app to tests
// Change package.json dev script as well

import "dotenv/config";

import { createApp } from "./app.js";

const app = createApp();

const port = process.env.PORT || 3000;

// If app is called by something else i.e. another file,
// listen won't be called
app.listen(port, (error) => {
        if (error) throw error;
        console.log(`Listening on port ${port}`);
});
