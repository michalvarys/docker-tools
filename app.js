// Require express and body-parser
const express = require("express")
const bodyParser = require("body-parser")
const axios = require("axios")
const app = express()
const PORT = 8000
// Tell express to use body-parser's JSON parsing
app.use(bodyParser.json())

const githubEvents = []
// const utils = require('util')
const exec = require('child_process').exec;
const dcCmd = 'docker-compose -f /home/eshop-kratomia/docker-compose.yml --env-file /home/eshop-kratomia/.env'

const commands = [
    'docker pull michalvarys/kratomia:latest',
    'docker pull michalvarys/varyshop:latest',
    // `${dcCmd} down`,
    `${dcCmd} up --force-recreate -d app`
]

const runCommand = async (cmd, cb) => new Promise((resolve, reject) => {
    exec(cmd, function (err, stdout, stderr) {
        if (err) {
            console.log("failed to pull docker image", err, stderr)
            reject(stderr)
            return
        }
        resolve(stdout)
    })
})

async function releaseNewVersion(commands) {
    console.log(`Initiating release`)
    for (const cmd of commands) {
        console.log(`running command ${cmd}`)
        const res = await runCommand(cmd)
        console.log(`command successfull ${res}`)
    }
    console.log(`release finished`)
}

app.get('/auto-release', async (req, res) => {
    try {
        await releaseNewVersion(commands);
        res.status(200)
        res.send({ success: true })
    } catch (error) {
        res.status(500)
        res.send({ success: false, error })
    }
})

app.post('/auto-release', async (req, res) => {
    try {
        await releaseNewVersion(req.body.commands);
        res.send({ success: true })
    } catch (error) {
        res.status(500).
            res.send({ success: false, error })
    }
})

app.post("/docker-status", async (req, res) => {
    console.log(req.body) // Call your action on the request here
    const { callback_url } = req.body
    // docker image is ready lets start releasing
    releaseNewVersion(commands)
    // try {
    //     const request = await axios.post(callback_url, {
    //         state: "success",
    //         description: "testing description",
    //         context: "Something happened",
    //         target_url: `http://206.189.51.22:8000/unknown`
    //     })

    //     console.log(request.body)
    // } catch (err) {
    //     console.log(err)
    // } finally {

    // }
    res.status(200).end() // Responding is important

})

// This defines a POST route at the `/webhook` path. This path matches the path that you specified for the smee.io forwarding. For more information, see "[Forward webhooks](#forward-webhooks)."
//
// Once you deploy your code to a server and update your webhook URL, you should change this to match the path portion of the URL for your webhook.
app.post('/webhook', express.json({ type: 'application/json' }), (request, response) => {
    // Respond to indicate that the delivery was successfully received.
    // Your server should respond with a 2XX response within 10 seconds of receiving a webhook delivery. If your server takes longer than that to respond, then GitHub terminates the connection and considers the delivery a failure.
    response.status(202).send('Accepted');

    const { headers, body: data } = request
    // Check the `x-github-event` header to learn what event type was sent.
    const event = headers['x-github-event'];
    const delivery = headers['x-github-delivery']
    const hookId = headers['x-github-hook-id']
    const targetId = headers['x-github-hook-installation-target-id']
    const targetType = headers['x-github-hook-installation-target-type']


    // You should add logic to handle each event type that your webhook is subscribed to.
    // For example, this code handles the `issues` and `ping` events.
    //
    // If any events have an `action` field, you should also add logic to handle each action that you are interested in.
    // For example, this code handles the `opened` and `closed` actions for the `issue` event.
    //
    // For more information about the data that you can expect for each event type, see "[AUTOTITLE](/webhooks/webhook-events-and-payloads)."
    if (event === 'issues') {
        const action = data.action;
        if (action === 'opened') {
            console.log(`An issue was opened with this title: ${data.issue.title}`);
        } else if (action === 'closed') {
            console.log(`An issue was closed by ${data.issue.user.login}`);
        } else {
            console.log(`Unhandled action for the issue event: ${action}`);
        }
    } else if (event === 'ping') {
        console.log('GitHub sent the ping event');
    } else if (event === 'push') {
        const eventData = { ...data, event, delivery, hookId, targetId, targetType }
        console.log("new github event", data, headers, eventData)
        githubEvents.push(eventData)

    } else {
        console.log(`Unhandled event: ${event}`);
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))