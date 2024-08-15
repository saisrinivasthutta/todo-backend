const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");

const path = require("path");

const databasePath = path.join(__dirname, "todo-app.db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = new sqlite3.Database("./todo-app.db");
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

//Initializing DB and Server
initializeDbAndServer();

//validating password
const validatePassword = (password) => {
  return password.length > 4;
};

//Creating Tables
db.serialize(() => {
  const createUserTableQuery =
    "create table if not exists users(id varchar(255) primary key, username varchar(255) unique , email varchar(255) not null, password varchar(255) not null, created_at TEXT not null, updated_at TEXT);";
  db.run(createUserTableQuery);

  const createTasksTableQuery =
    "create table if not exists todos(id primary key,user_id varchar(255), title varchar(255), description text, status varchar(255), created_at TEXT, updated_at TEXT);";
  db.run(createTasksTableQuery);

  const createUserProfileTableQuery =
    "create table if not exists profiles(id primary key,user_id varchar(255), name varchar(255) not null , bio text, contact_info varchar(12), created_at TEXT, updated_at TEXT);";
  db.run(createUserProfileTableQuery);
});

//Register API
app.post("/register", async (request, response) => {
  const {
    id,
    username,
    email,
    password,
    created_at,
    updated_at,
  } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
  const databaseUser = await db.get(selectUserQuery);

  if (databaseUser) {
    const createUserQuery = `
     INSERT INTO
      users (id,  username, email, password, created_at, updated_at )
     VALUES
      (
       '${id}',
       '${username}',
       '${email}',
       '${hashedPassword}',
       '${created_at}',
       '${updated_at}'  
      );`;
    if (validatePassword(password)) {
      await db.run(createUserQuery, (err, res) => {
        if (err) {
          response.send({ message: "User exists" });
        } else {
          response.send({ message: "User created successfully" });
        }
      });
    } else {
      response.status(400);
      response.send({ message: "Password is too short" });
    }
  } else {
    response.status(400);
    response.send({ message: "Invalid ID" });
  }
});

//Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
  await db.get(selectUserQuery, async (err, databaseUser) => {
    if (err) response.send(err);
    else {
      if (databaseUser === undefined) {
        response.status(400);
        response.send({ message: "Invalid user" });
      } else {
        await bcrypt.compare(
          password,
          databaseUser.password,
          (err, isPasswordMatched) => {
            if (isPasswordMatched === true) {
              response.send({ message: "Login success!" });
            } else {
              response.status(400);
              response.send({ message: "Invalid password" });
            }
          }
        );
      }
    }
  });
});

//Creating Todo API
app.post("/todos/", async (request, response) => {
  const {
    id,
    user_id,
    title,
    description,
    status,
    created_at,
    updated_at,
  } = request.body;
  const postTodoQuery = `
  INSERT INTO
    todos (id, user_id, title, description, status, created_at, updated_at)
  VALUES
    (${id}, '${user_id}', '${title}', '${description}','${status}', '${created_at}', '${updated_at}');`;
  await db.run(postTodoQuery, (err, success) => {
    if (err) {
      response.send({ message: "SQLite Error" });
    } else {
      response.send("Todo Successfully Added");
    }
  });
});

//Creating UserProfile API
app.post("/user-profiles/", async (request, response) => {
  const {
    id,
    user_id,
    name,
    bio,
    contact_info,
    created_at,
    updated_at,
  } = request.body;
  const postTodoQuery = `
  INSERT INTO
    profiles(id, user_id, name, bio, contact_info, created_at, updated_at)
  VALUES
    (${id}, '${user_id}', '${name}', '${bio}','${contact_info}', '${created_at}', '${updated_at}');`;
  await db.run(postTodoQuery, (err, success) => {
    if (err) {
      response.send({ message: "SQLite Error" });
    } else {
      response.send({ message: "Profile Successfully Added" });
    }
  });
});

//Updating Todo Status API
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { status } = request.body;
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todos
    WHERE 
      id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery, async (err, success) => {
    if (err) {
      response.send({ message: "Todo Item Not Found" });
    } else {
      const updateTodoQuery = `
    UPDATE
      todos
    SET
     status='${status}'
    WHERE
      id = ${todoId};`;

      await db.run(updateTodoQuery);
      response.send(`Status Updated`);
    }
  });
});

//Getting User Profile
app.get("/user-profiles/:user_id", async (request, response) => {
  const { user_id } = request.params;
  const getUserProfileQuery = `select * from profiles where user_id = ${user_id};`;
  await db.get(getUserProfileQuery, (err, userProfile) => {
    if (err) {
      response.send({ message: "No User Found" });
    } else {
      response.send(userProfile);
    }
  });
});

//Getting Todo s
app.get("/todos/:user_id", async (request, response) => {
  const { user_id } = request.params;
  const getTasksQuery = `select * from todos where user_id = ${user_id};`;
  await db.all(getTasksQuery, (err, results) => {
    if (err) {
      response.send({ message: "User Not Found" });
    } else {
      response.send(results);
    }
  });
});

//Deleting Todo API
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todos
  WHERE
    id = ${todoId};`;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
