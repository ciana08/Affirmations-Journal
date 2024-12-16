const express = require("express"); 
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const app = express(); 
const portNumber = 8000;
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') }) 
const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const dbName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_COLLECTION;
const key = process.env.KEY;
const uri = "mongodb+srv://" + username + ":" + password + "@cluster0.2z0wg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const databaseAndCollection = {db: dbName, collection: collectionName};
const { MongoClient, ServerApiVersion } = require('mongodb');

/*
process.stdin.setEncoding("utf8");
console.log(`Web server started and running at http://localhost:${portNumber}`);
const prompt = "Stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on('readable', () => {  
	const input = process.stdin.read();
	if (input !== null) {
		const command = input.trim();
        if (command === "stop") {
			console.log("Shutting down the server");
            process.exit(0);  
        } else {
			console.log(`Invalid command: ${command}`);
		}
        process.stdout.write(prompt);
        process.stdin.resume()
    }
});
*/

app.use(express.static(path.join(__dirname, 'styles')));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:false}));


app.use(
    session({
      secret: key, 
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 1000 * 60 * 60 * 24 }, 
    })
);


app.get("/", (request, response) => {
    response.render('register.ejs');
});

/* adds name, email, hashed pass to database */
app.post("/", async(request, response) => {
    const{name, email, password} = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const data = {name, email, hashedPassword};
    console.log(data);
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        let filter = { email: email };
        const cursor = client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
        const result = await user;
        if (result) {
            const user = await client.db(databaseAndCollection.db)
                            .collection(databaseAndCollection.collection)
                            .insertOne(data);
            response.render('login.ejs');
        } else {
            return response.status(400).send("Email is already registered.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

app.get("/login", (request, response) => {
    response.render('login.ejs');
});

app.post("/login", async(request, response) => {
    const{name, email, password} = request.body;
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        let filter = { email: { $eq: email } };
        const cursor = client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .find(filter);
        const result = await cursor.toArray();
        if (result.length === 0) {
            return response.status(400).send("Invalid email.");
        }
        const user = result[0];
        const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
        if (!passwordMatch) {
            return response.status(400).send("Invalid password.");
        }
        request.session.user = {
            name: user.name,
            email: user.email
        };
        response.render('index.ejs', { name: user.name });
    } catch (e) {
        console.error(e);
        response.status(500).send("Server error.");
    } finally {
        await client.close();
    }
});

app.get("/home", (request, response) => {
    if (request.session.user) {
        const {name} = request.session.user;
        response.render('index.ejs', {name});
    } else {
        response.render('login.ejs'); 
    }
});

app.post("/home", (request, response) => {
    response.render('journal.ejs');
});

app.get("/journal", (request, response) => {
    response.render('journal.ejs');
});

app.post("/journal", async(request, response) => {
    let title = request.body.title;
    let date = request.body.date;
    let mood = request.body.mood;
    let entry = request.body.entry;
    const email = request.session.user.email;
    const data = {title, date, mood, entry};
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db)
                            .collection(databaseAndCollection.collection)
                            .updateOne( {email}, {$addToSet: {journalEntries: data}});
        response.render('postJournal.ejs', {title, date, mood, entry});
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

app.get("/entries", async(request, response) => {
    let entries = "";
    const none = "NONE";
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        const email = request.session.user.email;
        const user = client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne({email});
        const result = await user;
        console.log(result);
        if(result){
            if (result.journalEntries) {
                result.journalEntries.forEach((entry) => {
                    entries += "<tr><td>" + entry.date + "</td><td>" + entry.title + "</td><td>" + entry.mood + "</td><td>" + entry.entry + "</td></tr>";
                });
            }
            response.render('entries.ejs', {entries});
        } else {
            entries += "<tr><td>" + none + "</td><td>" + none + "</td><td>" + none + "</td><td>" + none + "</td></tr>";
            response.render('entries.ejs', {entries});
        } 
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    } 
});

app.post("/entries", async(request, response) => {
    let total;
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        const email = request.session.user.email;
        const result = await client.db(databaseAndCollection.db)
                            .collection(databaseAndCollection.collection)
                            .updateOne( {email}, {$unset: {journalEntries: ""}});
        response.render('removeEntries.ejs', {total});
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    } 
});

app.get("/affirmations", async(request, res) => {
    try {
        const response = await fetch("https://www.affirmations.dev/");
        if(!response.ok) {
            throw new Error("Could not fetch");
        }
        const data = await response.json();
        res.render('affirmations.ejs', {affirmation: data.affirmation});

    } catch (e) {
        console.error(e);
        res.status(500);
    }
})

app.post("/affirmations", async(request, res) => {
    try {
        const response = await fetch("https://www.affirmations.dev/");
        if(!response.ok) {
            throw new Error("Could not fetch");
        }
        const data = await response.json();
        res.render('affirmations.ejs', {affirmation: data.affirmation});

    } catch (e) {
        console.error(e);
        res.status(500);
    }
})

app.get("/logout", (request, response) => {
    request.session.destroy((e) => {
        if(e) {
          return response.status(500).send("Logout failed.");
        }
        response.render('login.ejs');
      });
});


app.listen(portNumber);