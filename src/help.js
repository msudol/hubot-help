'use strict'

// Description:
//   Generates help commands for Hubot.
//
// Commands:
//   hubot help - Displays all of the help commands that this bot knows about.
//   hubot help <query> - Displays all help commands that match <query>.
//
// URLS:
//   /hubot/help
//
// Configuration:
//   HUBOT_HELP_REPLY_IN_PRIVATE - if set to any value, all `hubot help` replies are sent in private
//   HUBOT_HELP_DISABLE_HTTP - if set, no web entry point will be declared
//   HUBOT_HELP_HIDDEN_COMMANDS - comma-separated list of commands that will not be displayed in help
//
// Notes:
//   These commands are grabbed from comment blocks at the top of each file.

const helpContents = (name, commands) => `\
<!DOCTYPE html>
<html>
  <head>
  <meta charset="utf-8">
  <title>${name} Help</title>
  <style type="text/css">
    body {
      background: #d3d6d9;
      color: #636c75;
      text-shadow: 0 1px 1px rgba(255, 255, 255, .5);
      font-family: Helvetica, Arial, sans-serif;
    }
    h1 {
      margin: 8px 0;
      padding: 0;
    }
    .commands {
      font-size: 13px;
    }
    p {
      border-bottom: 1px solid #eee;
      margin: 6px 0 0 0;
      padding-bottom: 5px;
    }
    p:last-child {
      border: 0;
    }
  </style>
  </head>
  <body>
    <h1>${name} Help</h1>
    <div class="commands">
      ${commands}
    </div>
  </body>
</html>\
`

const getHiddenCommandsRaw = process.env['HUBOT_HELP_HIDDEN_COMMANDS'];
let getHiddenCommands = [];

if (getHiddenCommandsRaw != null) {
    getHiddenCommands = getHiddenCommandsRaw.split(',');
}

var hiddenCommandsPattern = function hiddenCommandsPattern () {
    if (getHiddenCommands) {
        return new RegExp(`^hubot (?:${getHiddenCommands != null ? getHiddenCommands.join('|') : undefined}) - `)
    }
}

// routine to parse the help commands
var getHelpCommands = function getHelpCommands (robot) {
  let helpCommands = robot.helpCommands()
  const robotName = robot.alias || robot.name

  // filter
  if (hiddenCommandsPattern()) {
    helpCommands = helpCommands.filter(command => !hiddenCommandsPattern().test(command))
  }

  helpCommands = helpCommands.map((command) => {
    if (robotName.length === 1) {
      return command.replace(/^hubot\s*/i, robotName)
    }

    return command.replace(/^hubot/i, robotName)
  })

  return helpCommands.sort()
}

module.exports = (robot) => {
  
  robot.logger.debug(`Hiding help commands: \"${getHiddenCommandsRaw}\"...`);
  
  const replyInPrivate = process.env.HUBOT_HELP_REPLY_IN_PRIVATE
  
  robot.respond(/help(?:\s+(.*))?$/i, (msg) => {
    
    let cmds = getHelpCommands(robot)
    const filter = msg.match[1]

    if (filter) {
      cmds = cmds.filter(cmd => cmd.match(new RegExp(filter, 'i')))
      if (cmds.length === 0) {
        msg.send(`No available commands match ${filter}`)
        return
      }
    }

    let emit = cmds.join('\n')
    
    // temporary if the help is too long just don't let it print
    if (emit.length >=2000) {

        //trim the string to the maximum length
        var trimmedString = emit.substr(0, 1900);

        //re-trim if we are in the middle of a word
        trimmedString = trimmedString.substr(0, Math.min(trimmedString.length, trimmedString.lastIndexOf("\n")))        
        
        emit = trimmedString + "\n... help too long, cutting display short";
    }
    
    if (replyInPrivate && (robot.adapterName === 'slack' || robot.adapterName === 'discord' || robot.adapterName === 'discobot') && msg.message && msg.message.user && msg.message.user.id) {
      msg.reply('replied to you in private!')
      return robot.send({ room: msg.message.user.id }, emit)
    } 
    else if (replyInPrivate && msg.message && msg.message.user && msg.message.user.name) {
      msg.reply('replied to you in private!')
      return robot.send({ room: msg.message.user.name }, emit)
    } 
    else {
      return msg.send(emit)
    }
  })

  // display the help on the bot webpage
  if (process.env.HUBOT_HELP_DISABLE_HTTP == null) {
      
    return robot.router.get(`/${robot.name}/help`, (req, res) => {
        
      let cmds = getHelpCommands(robot).map(cmd => cmd.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))

      if (req.query.q != null) {
        cmds = cmds.filter(cmd => cmd.match(new RegExp(req.query.q, 'i')))
      }

      let emit = `<p>${cmds.join('</p><p>')}</p>`

      emit = emit.replace(new RegExp(`${robot.name}`, 'ig'), `<b>${robot.name}</b>`)

      res.setHeader('content-type', 'text/html')
      res.end(helpContents(robot.name, emit))
    })
  }
  
}
