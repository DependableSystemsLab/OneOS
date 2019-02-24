const path = require('path');
const http = require('http');
const { EventEmitter } = require('events');
const express = require('express');
const Pubsub = require('./Pubsub.js');
const FSRouter = require('./FileSystem.js').createRouter;
const MqttWsBridge = require('../util/MqttWsBridge.js');

const STATIC_PATH = path.resolve(__dirname, './runtime/web');
const PORT = 3000;

class WebServer extends EventEmitter {
  constructor (pubsub_url){
    super();

    console.log('Web Server using Pubsub '+process.oneos.pubsub_url);

    this.pubsub = new Pubsub(pubsub_url, {
      id: 'SA/web-server'
    });

    this.systemAPI = process.api || null;
    
    var app = express();
    var server = http.createServer(app);
    var bridge = new MqttWsBridge(this.pubsub.url, { server: server, path: '/pubsub' }, {
        restricted_topics: process.oneos.agentID+':stdout' // this is necessary to prevent this process listening to its own output, causing an infinite loop
    });

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use('/', express.static(STATIC_PATH));

    app.get('/api', (req, res, next)=>{
        console.log('GET /api');
      this.systemAPI.getAllRuntimes()
        .then((info)=>res.json(info));
    });

    app.use('/fs', FSRouter(this.pubsub.url));

    // RESTful shell
    // app.post('/shell', (req, res, next)=>{
    //   console.log(req.body);
    //   this.pubsub.publish('shell-session/1/in', req.body.cmd)
    //     .then((data)=>{
    //       res.json({
    //         result: 'done'
    //       });
    //     })
    //     .catch((err)=>{
    //       res.status(500).send('Error 500: Server Error');
    //     });
    // });

    // app.get('/', (req, res, next)=>{
    //   res.json({
    //     pubsub_url: pubsub_url
    //   });
    // });

    app.get('*', (req, res, next)=>{
      res.redirect('/#'+req.originalUrl);
    });
    
    server.listen(PORT, function(){
      console.log(">>> Starting web service on PORT :"+server.address().address+' :'+server.address().port);
    });

    this.app = app;
  }
}

module.exports = WebServer;