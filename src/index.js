const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessages, generateLocationMessages } = require('./utils/messages')
const { addUser,
        removeUser,
        getUser,
        getUsersInRoom 
} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    console.log('New WebSocket connection')
    
    socket.on('join', (options, callback) => {
        const admin = 'Admin'
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('myMessage', generateMessages(admin, `How're you doin' ${user.username}? Welcome to ${user.room} chat room!`))
        socket.broadcast.to(user.room).emit('myMessage', generateMessages(admin, `${user.username} has joined this room!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }
        io.to(user.room).emit('myMessage', generateMessages(user.username, message))
        callback()
    })

    // location
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessages(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const admin = 'Admin'
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('myMessage', generateMessages(admin, `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

//server
server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})
