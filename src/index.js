/*
Channel specific timer:

timer start <countdown> (optional)
timer pause <reason> (optional)
timer resume 
timer stop    // returns the total time was running for / remaining.
timer         // shows the current time if any, this help if none.
*/

const Discord = require('discord.js');
const client  = new Discord.Client();
const micro   = require('micro')

require('dotenv').config()

var moment = require('moment');

// console.log('Token:', process.env.TOKEN);

const server = micro(async (req, res) => 'Ready')

server.listen(3000)

const help = 
	'\n' + 
	'timer start <countdown> (optional)\n' + 
	'timer pause <reason> (optional)\n' + 
	'timer resume\n' + 
	'timer stop\n' + 
	'timer // returns current timer'

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});


function humanize(a, b) {
	var hours   = Math.abs(a.diff(b, 'hours')),
		minutes = Math.ceil(Math.abs(a.diff(b, 'minutes')) - (hours * 60), 0),
		seconds = Math.abs(a.diff(b, 'seconds')),
		out = []

	if(hours > 1) out.push(hours + ' hours')
	if(hours == 1) out.push(hours + ' hour')
	if(minutes > 1) out.push(minutes + ' minutes')
	if(minutes == 1) out.push(minutes + ' minute')
	if(!hours && !minutes & seconds > 1) out.push(seconds + ' seconds')
	if(!hours && !minutes & seconds == 1) out.push(seconds + ' second')

	return out.join(', ') || 'none'
}

function renderTimer(timer, now) {

	var until = moment(timer.started)
	until.add((timer.time || 0), 'seconds')

	now = timer.paused || now 

	if(timer.time) {

		var time = moment.utc(until.diff(now)).format("HH:mm:ss")

		if(until.isAfter(now) > 0){
			return humanize(until, now) + ' remaining — ' + time			
		}
	
		else {
			return 'Time is up'			
		}
	
	}

	else {
		var time = moment.utc(now.diff(until)).format("HH:mm:ss")
		return 'elapsed ' + humanize(until, now) + ' — ' + time
	}
}


var timers = {}


function manageTimers(){
  	var now = moment.utc()

	for(channel in timers) {
  		let timer = timers[channel]

	  	var diff = now.diff(timer.started,'hours')

		// Clear anything older that 6 hours
		if(diff > 6){
			delete timers[channel]
		}	

		else if(timer.time) {

			// Check if we should inform the channel: 1 hour, 30 minutes, 15 minutes
			var until = moment(timer.started).add((timer.time || 0), 'seconds')
			var minutes = until.diff(timer.paused || now, 'minutes')
			var msg
			
			switch(minutes) {
				case 60:
					msg = '1 hour remaining'
					break
				case 30:
					msg = '30 minutes remaining'
					break
				case 15:
					msg = '15 minutes remaining'
					break
			}

			if(until.isBefore(timer.paused || now) > 0){
				msg = 'Time is up'
				delete timers[channel]
			}

			if(msg && timer.msg != msg) {
				timer.msg = msg
				client.channels.get(channel).send(msg);				
			}
		
			// Used for testing only
			// timer.started.subtract(1, 'minutes')

		}

	}
}


var manageInt = setInterval(manageTimers, 30 * 1000)

client.on('message', msg => {
  if (msg.content.indexOf('timer') == 0) {

  	var user          = msg.author.username 
  	var channel       = msg.channel.id
  	var opts          = msg.content.match(/\S+/g)
  	var current       = timers[channel]
  	var clientchannel = client.channels.get(channel) // msg.channel


  	var action        = opts[1]
  	var param         = opts[2]
  	var now           = moment.utc()

  	switch(action) {

		case 'start':

			if(current) {
				return msg.reply('Please stop the current timer first: timer stop')
			}

			var time    = opts[2],
				hours   = 0,
				minutes = 0,
				seconds = 0 

			if(time) {
				time = time.split(':')

				switch(time.length) {
					case 3:
						hours   = parseFloat(time[0]) || 0
						minutes = parseFloat(time[1]) || 0
						seconds = parseFloat(time[2]) || 0
						break
					case 2:
						hours   = parseFloat(time[0]) || 0
						minutes = parseFloat(time[1]) || 0
						break
					case 1:
						hours   = parseFloat(time[0]) || 0
						break
				}

			}

			var current = {
				author: user,
				started: now,
				time: (hours * 60 * 60) + (minutes * 60) + seconds
			}

			timers[channel] = current

			if(current.time) {
				msg.reply('timer started, ' + renderTimer(current, now))
			}
			else {
				msg.reply('timer started')
			}

			break;

		case 'pause':
			if(current) {
				current.paused = now
				msg.reply('timer paused, ' + renderTimer(current, now))
			}

			else {
				msg.reply('no current timer')
			}

			break;

		case 'resume':

			if(current) {
				var paused = current.paused
				var started = current.started
				
				// Add extra time
				started.add( 
					now.diff(paused, 'seconds'), 'seconds'
				)
				
				// Clear paused
				current.paused = null 

				msg.reply('timer resumed, ' + renderTimer(current, now))
			}

			else {
				msg.reply('no current timer')
			}


			break;

		case 'stop':

			if(current) {
				msg.reply('timer stopped, ' + renderTimer(current, now))
				delete timers[channel]
			}

			else {
				msg.reply('no current timer')
			}


			break;

		case 'help':
  			msg.reply(help)
  			break;

  		default:

  			if(current) {
  				// msg.reply(
  				// 	renderTimer(current, now)
  				// )
				clientchannel.send(
					renderTimer(current, now)
				)

  			}

  			else {
  				clientchannel.send(help)
  			}
   	}

  }
});

client.login(process.env.TOKEN);
