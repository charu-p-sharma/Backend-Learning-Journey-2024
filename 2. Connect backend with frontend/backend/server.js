require('dotenv').config()

const express = require('express')

const app = express()

app.get('/', (req, res) => {
    res.send('SERVED!')
})

//Get a list of 5 jokes
app.get('/api/jokes', (req, res) => {
    const jokes = [
        {
            id: 1,
            title: "A joke",
            content: "This is a joke"
        },
        {
            id: 2,
            title: "Another joke",
            content: "This is second a joke"
        },
        {
            id: 3,
            title: "Third joke",
            content: "This is a Third joke"
        },
        {
            id: 4,
            title: "Fourth joke",
            content: "This is a  Fourth joke"
        },
        {
            id: 5,
            title: "Fifth joke",
            content: "This is a Fifth joke"
        },

    ]
    res.send(jokes);
})


app.listen(process.env.PORT, () => {
    console.log(`Example app listening on port ${process.env.PORT}`)
}
)