/**
 * Webhooks plugin
 *
 * Notifies all events (up, down, paused, restarted) by sending a
 * HTTPS POST request to a slack.com URL. The request will have a
 * JSON payload of data from the event
 *
 * To enable the plugin, call init() from plugins/index.js
 *   exports.init = function() {
 *     require('uptime-slack').init();
 *   }
 *
 * Example configuration
 *   webhooks:
 *     event:
 *       up:
 *         - 'https://xxxx.slack.com/services/hooks/incoming-webhook?token=xxxxxx'
 *       down:
 *         - 'https://xxxx.slack.com/services/hooks/incoming-webhook?token=xxxxxx'
 *       paused:
 *         - 'https://xxxx.slack.com/services/hooks/incoming-webhook?token=xxxxxx'
 *       restarted:
 *         - 'https://xxxx.slack.com/services/hooks/incoming-webhook?token=xxxxxx'
 *     dashboardUrl: 'http://uptime.example.com'
 *     channel:      '#slack-channel'
 *     username:     'uptime'
 *     icon_emoji:   ':fire:'
 */

var https       = require('https');
var url        = require('url');
var util       = require('util');
var config     = require('config');
var CheckEvent = require('../../models/checkEvent');


exports.init = function() {
  CheckEvent.on('afterInsert', function(checkEvent) {
    var webhooks = config.webhooks;
    var hrefs = webhooks.event[checkEvent.message];

    if (!util.isArray(hrefs)) return;
    checkEvent.findCheck(function(err, check) {
        var payload = {};
        if (err) return console.error(err);
        payload.channel     = webhooks.channel;
        payload.username    = webhooks.username;
        payload.text        = '<' + webhooks.dashboardUrl + '/dashboard/checks/' + check._id + '?type=hour&date=' + checkEvent.timestamp.valueOf() + '|' + check.name +'>' + ' ' + checkEvent.message;
        payload.icon_emoji  = webhooks.icon_emoji;

        hrefs.forEach(function(href) {
            var options = url.parse(href);
            options.method = 'POST';
            options.headers = {
                'Content-Type' : 'application/json'
            };

            var req = https.request(options, function(res) {

            });

            req.on('error', function(e) {
              console.log('Problem with webhook request: ' + e.message);
            });

            req.write(JSON.stringify(payload));
            req.end();
        });

    });
  });
  console.log('Enabled slack.com webhook plugin');
};