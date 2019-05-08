var SCWorker = require('socketcluster/scworker');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var healthChecker = require('sc-framework-health-check');

class Worker extends SCWorker {
    run() {
        console.log('   >> Worker PID:', process.pid);
        var environment = this.options.environment;

        /**
         * Log debug messages.
         * Scoped to run function since we need environment
         * @param {*} obj Message or object to be logged.
         */
        function log(obj) {
            if (environment === 'dev') {
                console.log(obj);
            }
        }

        var app = express();

        var httpServer = this.httpServer;
        var scServer = this.scServer;

        if (environment === 'dev') {
            // Log every HTTP request. See https://github.com/expressjs/morgan for other
            // available formats.
            app.use(morgan('dev'));
        }
        app.use(serveStatic(path.resolve(__dirname, 'public')));

        // Add GET /health-check express route
        healthChecker.attach(this, app);

        httpServer.on('request', app);

        var count = 0;

        scServer.addMiddleware(scServer.MIDDLEWARE_SUBSCRIBE, (req, next) => {
            // Allow subscribe to anything during development
            // TODO: Only allow subscription to own private channel
            if (true || req.socket.id === req.channel) {
                next(); // Allow
            } else {
                let msg = `${req.socket.id} is not allowed to subscribe to ${req.channel}`;
                log(msg);
                next(msg); // Block
            }
        });

        scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_IN, (req, next) => {
            // Disallow direct broadcasting right now
            if (true) {
                next(); // Allow
            } else {
                let msg = `${req.socket.id} is not allowed to publish to ${req.channel}`;
                log(msg);
                next(msg); // Block
            }
        });

        scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_OUT, (req, next) => {
            // console.log(req);
            next();
        });

        /**
         * Handle incoming connections and listen for events.
         *
         * Every published message should include the following:
         * {
         *     action: string,
         *     channel: string,
         *     sender: string
         * }
        */
        scServer.on('connection', (socket) => {

            log(`${socket.id} connected.`);

            /**
             * Incoming format:
             * {
             *     channel: string
             * }
             */
            socket.on('join', (obj) => {
                if (!obj || !obj.channel || obj.channel.length === 0) {
                    log('REJECTED: Bad join request.');
                    log(obj);
                    return;
                }

                log(`Client ID ${socket.id} joined channel ${obj.channel}.`);
                socket.emit('joined', { channel: obj.channel });

                // Announce the join to everyone
                scServer.exchange.publish(obj.channel, {
                    action: 'join',
                    channel: obj.channel,
                    sender: socket.id
                });
            });

            /**
             * Incoming format:
             * {
             *     channel: string,
             *     recipient: string,
             *     offer: object
             * }
             */
            socket.on('offer', (obj) => {
                if (!obj || !obj.channel || !obj.recipient || !obj.offer) {
                    log('REJECTED: Bad offer message.');
                    log(obj);
                    return;
                }

                scServer.exchange.publish(obj.recipient, {
                    action: 'offer',
                    channel: obj.channel,
                    sender: socket.id,
                    offer: obj.offer
                });
            });

            /**
             * Incoming format:
             * {
             *     channel: string,
             *     recipient: string,
             *     answer: object
             * }
             */
            socket.on('answer', (obj) => {
                if (!obj || !obj.channel || !obj.recipient || !obj.answer) {
                    log('REJECTED: Bad answer message.');
                    log(obj);
                    return;
                }

                scServer.exchange.publish(obj.recipient, {
                    action: 'answer',
                    channel: obj.channel,
                    sender: socket.id,
                    answer: obj.answer
                });
            });

            /**
             * Incoming format:
             * {
             *     channel: string,
             *     recipient: string,
             *     candidate: object
             * }
             */
            socket.on('candidate', (obj) => {
                if (!obj || !obj.channel || !obj.recipient || !obj.candidate) {
                    log('REJECTED: Bad candidate message.');
                    log(obj);
                    return;
                }

                scServer.exchange.publish(obj.recipient, {
                    action: 'candidate',
                    channel: obj.channel,
                    sender: socket.id,
                    candidate: obj.candidate
                });
            });

            /**
             * Incoming format:
             * {
             *     channel: string
             * }
             */
            socket.on('leave', (obj) => {
                if (!obj || !obj.channel || obj.channel.length === 0) {
                    log('REJECTED: Bad leave request.');
                    log(obj);
                    return;
                }

                log(`${socket.id} left channel ${obj.channel}`);

                // Announce the join to everyone
                scServer.exchange.publish(obj.channel, {
                    action: 'leave',
                    channel: obj.channel,
                    sender: socket.id
                });
            });

            socket.on('disconnect', () => {
                log(`${socket.id} disconnected.`);
            });
        });
    }
}

new Worker();
