# OneOS: Overlay Network Operating System

OneOS is a high-level middleware-based distributed operating system providing a single system image of a heterogeneous computer network. Each machine is represented as a resource within OneOS, and the OneOS Scheduler allocates jobs on the appropriate machines. Pipes can be created between processes similar to how it is done in UNIX systems; OneOS pipes are created over TCP.

Here are some of the publications and other materials that discuss OneOS in more depth:

* [Poster](http://ece.ubc.ca/~kumseok/assets/OneOS-Poster-EuroSys19.pdf), [Abstract](https://www.eurosys2019.org/wp-content/uploads/2019/03/eurosys19posters-abstract72.pdf), and [Demo Video (No Sound)](http://ece.ubc.ca/~kumseok/assets/OneOS-Demo-EuroSys19.mp4) - [EuroSys2019](https://www.eurosys2019.org/accepted-posters/)
* [Workshop Paper](https://www.usenix.org/system/files/hotedge19-paper-jung_0.pdf), [Slides](https://www.usenix.org/sites/default/files/conference/protected-files/hotedge19_slides_jung.pdf)
* [Web Desktop Demo Video](http://ece.ubc.ca/~kumseok/assets/OneOS-2020Jan.mp4)


## Getting Started

There are 2 ways to get started with OneOS. You can either:

1. [Get the pre-built Docker image](#oneos-docker-image) and check out the sample OneOS grid configured in a `docker-compose.yml` file.
2. [From this repository](#install-from-github), and follow the [next steps](#configuration) for configuring and running a OneOS grid.

---

## Method 1
### OneOS Docker Image

If you use Docker (+ Docker-compose), the easiest way to get OneOS and run a test grid is to download this [`docker-compose.yml`](docker/docker-compose.yml) file, and then to use `docker-compose up` to launch the containers:

```
~$ docker-compose up
```

Upon launching for the first time, Docker compose will pull the OneOS image from Docker Hub automatically. The [`docker-compose.yml`](docker/docker-compose.yml) file defines 5 containers, all using the same base image. 1 container is used to host a MongoDB server, 1 container is used to host the Publish-Subscribe server, and the remaining 3 each contain an instance of OneOS Runtime. The following describes how each of the containers are configured and how they interact with the host machine:

1. Container `pubsub`: hosts Publish-Subscribe service and exposes it on host port `1883` and container port `1883`. Other containers can reach it at `//pubsub:1883`.
2. Container `mongo`: hosts MongoDB service and exposes it on host port `27018` and container port `27017`. Other containers can reach it at `//mongo:27017`.
3. Container `oneosd-$N`: each contain an instance of the OneOS Runtime, and serves the Web Desktop application on host port `300N`. Each of the Runtimes have already been configured to use the default settings.

Of course, the Docker network you spawn would be running locally and so would all containers, but this should give you an idea of how OneOS would be deployed over the network, assuming each container runs on a separate machine.

Once the network is running, you can open the OneOS Web Desktop at `//localhost:300N` where `N` is the index of the Runtime hosting the Web Desktop. (*The Web Desktop is meant to be served at a fixed ip:port, but the current implementation does not serve it this way. The user has to identify the correct ip:port manually for now*)

---


**Known issues during installation**

> Depending on the system or Node.js installation, some of the following may occur during installation:

> * On direct global installation using `npm i -g` the package breaks due to dependency issues. 
> * Installation goes into an infinite loop, printing messages like `user "nobody" does not have permission to access the dev dir`.
>    * *Potential fixes:* run the command with `sudo` - `sudo npm install -g --no-optional oneos`.
> * Some error/warning messages like `SKIPPING OPTIONAL DEPENDENCY` are printed, but the installation finishes anyway.
>    * It seems safe to ignore these errors as they are regarding optional dependencies.
>    * To prevent these errors, `--no-optional` flag can be used to skip installing optional dependencies - `npm install -g --no-optional oneos`

As mentioned above, you will need to have access to a MongoDB service for OneOS to run properly (you will not see a file system otherwise).

When you have access to a MongoDB service (we will assume the service is at `mongodb://localhost:27017` here), first initialize the OneOS file system by entering the following command:

```
~$ npm explore -g oneos -- npm run reset-fs mongodb://localhost:27017/oneos-fs
```

The above command will spawn a new shell in the newly installed `oneos` directory (in the global `node_modules` directory), then run the `reset-fs` script which will initialize the OneOS file system by populating the MongoDB database it uses as a storage backend. There is a possibility the script may fail the first time you run the command (because currently it does not handle the case where the `oneos-fs` database does not exist); in this case, just run the above command again and it should work.

After this, follow the next steps to [configure the OneOS Runtimes](#configuration).

---

## Method 2
### Install from Github

If you want to just download this repository and install it, then you can enter the following:

```
~$ git clone https://github.com/DependableSystemsLab/OneOS
~$ cd OneOS
~/OneOS$ npm install
~/OneOS$ npm install -g
```
We run `npm install` and then `npm install -g` as on direct global installation the package breaks due to some dependency issue. 
As mentioned above, you will need to have access to a MongoDB service for OneOS to run properly (you will not see a file system otherwise).

When you have access to a MongoDB service (we will assume the service is at `mongodb://localhost:27017` here), first initialize the OneOS file system by entering the following command:

```
~/OneOS$ npm run reset-fs mongodb://localhost:27017/oneos-fs
```

The `reset-fs` script will initialize the OneOS file system by populating the MongoDB database it uses as a storage backend. There is a possibility the script may fail the first time you run the command (because it does not handle the case where the `oneos-fs` database does not exist); in this case, just run the above command again and it should work.

After this, follow the next steps to [configure the OneOS Runtimes](#configuration).

---

### Configuration

For the following instructions, we will assume the following:

* There are 3 devices: A, B, and C.
* The 3 devices have the IPs:
    * *A*: `192.168.0.10`
    * *B*: `192.168.0.11`
    * *C*: `192.168.0.12`
* *Device A* will serve the Publish-Subscribe service at `192.168.0.10:1883`
* *Device A* will serve the MongoDB service at `192.168.0.10:27017`


Before you run or configure the OneOS Runtimes, make sure that the following services are running on *device A* and are reachable by devices *B* and *C*:

1. MQTT Publish-Subscribe: start by entering `oneos psd`
2. MongoDB: start by entering `service mongod start`


Then, start a OneOS Runtime on each of the devices A, B, and C by using the following command:
```
~$ oneosd
```

Upon initial boot, the user will be asked to configure the Runtime (interactive). The following parameters should be configured:

* *Publish-Subscribe service URL:* Enter `mqtt://192.168.0.10` (IP of device A)
* *Storage Backend URL:* Enter `mongodb://192.168.0.10:27017/oneos-fs` (IP of device A). The database name `oneos-fs` *must be included* in the URL.
* *Runtime ID:* Leave it blank for random UUID, or enter a unique ID per each Runtime (e.g., `my-runtime-A`)
* *Maximum memory allowed:* Leave it as default or enter a valid integer value
* Whether the Runtime should be a Kernel Runtime (allowed to host Kernel Agents) - at least 1 Runtime should be a Kernel Runtime
* Whether the Runtime will expose any I/O devices from the host machine - say "no" for now; we will cover I/O configuration in another document

After the initial configuration, subsequent executions of the command `oneosd` will start the OneOS Runtime right away, skipping the interactive configuration. The configuration file is saved in the `$HOME/.oneos` directory. If you want to start the Runtime with a different ID (with all other settings unchanged), you can optionally provide an argument like this:

```
oneosd my-runtime-B
```

---

### Usage

Once the OneOS Runtimes have started and have launched the appropriate Kernel Agents, the system is ready to use. You can interact with the system using either the [CLI](#oneos-cli) or the [Web Desktop](#oneos-web-desktop).


#### OneOS CLI

On any of the devices, simply type `oneos` to connect to the OneOS shell server.
Once in the CLI environment, you can explore the system using a bash-like syntax.
The following commands are currently supported:

* `ls` - List directories
* `ps` - List processes
* `cd` - Change directories
* `pwd` - Print Working Directory
* `cat` - Concatenate


#### OneOS Web Desktop

* You can see a [video Demo of the Web Desktop here](http://ece.ubc.ca/~kumseok/assets/OneOS-2020Jan.mp4).

---

## License

MIT
