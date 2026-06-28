### Scripting Languages
In programming, scripting allows you to write a program that can be executed by a computer quickly and without much effort on
configuration and project setup.

The goal of scripting languages is to automate tasks that would otherwise be done manually. They are often used for writing small programs, 
automating repetitive tasks, and managing system operations.

> A scripting language is a language designed to automate tasks, glue systems together, and extend existing applications. But different scripting
> languages have different strengths, and they are often used for different purposes. Some deal with low-level tasks, like system administration,
> while others are more general-purpose, like web development.

### Modern Scripting Languages
Scripting languages are used in a wide range of applications, from web development to data analysis, and they are often chosen for their ease of use and flexibility. 

Some popular modern scripting languages include:
- Bash
- Python
- Lua
- JavaScript
- PHP
- Kotlin

#### Bash - System and Server Automation
Bash is the default Unix shell used to run commands and write automation scripts. It excels at interacting with the OS.

- Automate repetitive system tasks
- Chain OS commands together
- Manage files, processes, servers
- Essentials DevOps and Linux administration

Example: When working with docker containers, you can use Bash scripts to automate the process of building, running, and managing containers. 
For instance, you can write a script that pulls/builds the latest image, starts a container, and sets up the necessary environment variables.

```shell script
    #!/bin/bash
    docker build -t my-app .
    docker run -d -p 8080:8080 my-app
```

#### Python - General-Purpose Automation, Data, AI
Python is a general-purpose scripting language known for its simplicity and readability with a massive ecosystem. It is widely used in web development, data analysis, artificial intelligence, and more.

Example: You can use Python to automate data processing tasks, such as reading data from a CSV file, performing calculations, and generating reports.

```python
import csv

with open('data.csv', 'r') as file:
    reader = csv.reader(file)
    for row in reader:
        print(row)
```

- Huge library ecosystem
- Easy to learn and use
- Powerful data analysis and machine learning tools


> Python is a preferred language for scripting when the task is complicated and deals with data like CSV, text, JSON, etc. One can tap into its ecosystem and pull required
> libraries to perform the task. From processing, persisting, and deploying data, Python has a library for almost everything. Some popular libraries include:
> - NumPy for numerical computing
> - Pandas for data manipulation and analysis
> - Matplotlib for data visualization

#### Lua – Lightweight Embedded Scripting
Lua is a tiny, fast scripting language designed to be embedded inside applications. It is famous for its execution speed, small footprint, and simple syntax.
Because it embeds easily into C/C++ engines, it is heavily used for game development, Redis databases, and IoT network devices.

Example: Lua is used in Redis to implement the AOF persistence mechanism, where Lua scripts are executed to handle data storage and retrieval efficiently.

```lua
    local key = KEYS[1]
    local value = ARGV[1]
    redis.call('SET', key, value)
```

- Game engines (Roblox, WoW addons)
- Nginx/OpenResty scripting
- Redis server-side scripts

#### JavaScript - Prototype-based language
JavaScript, when viewed purely as a scriptinmg language, is a tiny, flexible, dynamic, prototype-based language designed for
embedding, automation, and lightweight logic injection.

It is widely used in web development, server-side scripting, and even desktop application development. JavaScript is known for its event-driven, 
non-blocking I/O model, making it suitable for building scalable network applications.

- Dynamic types resolved at runtime
- Prototype-based objects inherit from objects not classes
- JIT compiled but conceptually interpreted
- Event-driven, async by default

Example: FileSystem cleanup script in JavaScript.
```javascript
// cleanup.js
import fs from "fs";

const dir = "./logs";

for (const file of fs.readdirSync(dir)) {
  if (file.endsWith(".old")) {
    fs.unlinkSync(`${dir}/${file}`);
    console.log("Deleted:", file);
  }
}
```

Example: CLI tool script
```javascript
#!/usr/bin/env node

const name = process.argv[2] ?? "stranger";
console.log(`Hello, ${name}`);
```

> JavaScript is a popular choice for scripting when the task is simple and doesn't require complex data manipulation or complex logic. It is a great choice for
> lightweight logic injection, automation, and glue code between different systems. It is also widely used in web development for client-side scripting and server-side scripting with Node.js.
> 
> JavaScript is a secondary choice for developers when deploying to AWS Lambda, as it is a supported runtime and helps spin up a lightweight serverless environment.