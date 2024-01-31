//require('dotenv').config();
var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var { MongoClient, ServerApiVersion } = require('mongodb');

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/scrape";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
//const client = new MongoClient(MONGODB_URI, {
//    serverApi: {
//        version: ServerApiVersion.v1,
//        strict: true,
//        deprecationErrors: true,
//    }
//});
//async function run() {
//    try {
//        // Connect the client to the server	(optional starting in v4.7)
//        await client.connect();
//        // Send a ping to confirm a successful connection
//        await client.db("admin").command({ ping: 1 });
//        console.log("Pinged your deployment. You successfully connected to MongoDB!");
//    } finally {
//        // Ensures that the client will close when you finish/error
//        await client.close();
//    }
//}
//run().catch(console.dir);

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

// Routes

// Route for scraping the db for articles and sending them to the client
app.get("/scrape", function (req, res) {

    // First, we grab the body of the html with axios
    axios.get("http://www.historytoday.com/latest/").then(function (response) {

        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);

        // Creates an array for storing the articles
        var result_array = [];

        // Now, we grab every h3 that is a child of class field-name-title, and do the following:
        $("article h3").each(function (i, element) {

            // Save an empty result object
            var result = {};

            // Add the text, the href of every link, and an article summary, and save them as properties of the result object
            result.title = $(this)
                .children("a")
                .text();
            result.link = "http://www.historytoday.com" + $(this)
                .children("a")
                .attr("href");
            result.summary = $(this)
                .siblings("div.field--name-field-summary").children("p").text();

            // Push the data for an article to the result array
            result_array.push(result);

        });

        // Return the articles to the client
        res.json(result_array);
    })
    .catch (function (error) {
        console.log(error);
    });
});

// Route for saving a new Article in the db
app.post("/save_article/", function(req,res) {

  // First checks to see if the article has already been saved
  db.Article.findOne({"title": req.body.title})
    .then(function(dbArticle) {
      
      // If it is a new article, it is saved
      if (dbArticle == null) {
        db.Article.create(req.body)
          .then(function(dbArticle) {
            res.json("saved");
          })
          .catch(function(err) {
            // If an error occurred, log it
            console.log(err);
          })
      }

      // Else the client is notified that it is a duplicate
      else {
        res.json("duplicate");
      }
    })
})

// Route for deleting an Article from the db
app.get("/delete_article/:id", function(req,res) {

  db.Article.findOneAndDelete({_id: req.params.id})
    .then(function(response) {
      res.json("deleted")
    })
    .catch(function(err) {

      // If an error occurred, log it
      console.log(err);
    })
})

// Route for getting all Articles from the db
app.get("/saved_articles", function(req, res) {

  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {

      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {

      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for creating a new note in the db
app.post("/save_note/:id", function(req,res) {

  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated Article -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push:{note: dbNote._id} }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });

  })

 // Route for getting all notes for an article
app.get("/notes/:id", function(req,res) {

  console.log("id: " + req.body.id);

  db.Article.findOne({_id: req.params.id})
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, log it
      console.log(err);
    })
})

// Route for deleting a note from the db
app.get("/delete_note/:article_id/:note_id", function(req,res) {

  db.Note.findOneAndDelete({_id: req.params.note_id})
    .then(function(response) {
      return db.Article.findOneAndUpdate({ _id: req.params.article_id }, { $pull:{note: req.params.note_id} }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
})

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});