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

var https      = require('https');
var url        = require('url');
var util       = require('util');
var config     = require('config');
var CheckEvent = require('../../models/checkEvent');
var lodash     = require('lodash')
var moment     = require('moment')

var parse_tags = function(tags){
  var data = lodash.
        filter(tags, function(string){ return (string.indexOf(":") >= 0 ? true : false) }).
        map(function(string){ return string.split(":") });
  
  return lodash.object(data);
}

var get_color_from_status = function(status){
  var colors = {
    'up': 'good',
    'down': 'danger',
    'restarted': 'warning',
    'paused': 'warning'
  };

  return colors[status];
}

exports.init = function() {
  CheckEvent.on('afterInsert', function(checkEvent) {
    var webhooks = config.webhooks;
    var hrefs = webhooks.event[checkEvent.message];

    if (!util.isArray(hrefs)) return;
    checkEvent.findCheck(function(err, check) {
      var options = parse_tags(check.tags);
      var payload = {};

      if (err) return console.error(err);
      
      payload.channel = (options.hasOwnProperty('channel') === true ? '#' + options.channel : webhooks.channel);
      payload.username = webhooks.username;
      payload.text = '<' + webhooks.dashboardUrl + '/dashboard/checks/' + check._id + '?type=hour&date=' + checkEvent.timestamp.valueOf() + '|Uptime Check - ' + check.name +'>' + ' ' + checkEvent.message;

      if(options.hasOwnProperty('admin') === true){
        payload.text = payload.text + ' @' + options.admin;
      }

      payload.attachments = [{
        'color': get_color_from_status(checkEvent.message),
        'fields': [
          {
            'title': '이름',
            'value': check.name,
            'short': true
          },
          {
            'title': 'Type',
            'value': check.type,
            'short': true
          },
          {
            'title': 'Uptime',
            'value': (parseInt(check.downtime / 1000)).toString() + ' 초',
            'short': true
          },
          {
            'title': 'Downtime',
            'value': (parseInt(check.uptime / 1000)).toString() + ' 초',
            'short': true
          },
          {
            'title': 'URL',
            'value': check.url,
            'short': false
          },
          {
            'title': '마지막 체크 시간',
            'value': moment(check.lastTested).format('YYYY-MM-DD h:mm:ss'),
            'short': false
          }
        ]
      }];

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
