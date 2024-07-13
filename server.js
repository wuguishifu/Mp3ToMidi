const express = require('express');
const app = express();

app.post('/test', async (req, res) => {
    // console.log(req);
    console.log(req.headers);
    res.status(501).send('not implemented');
});

app.listen(3000);