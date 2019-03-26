# OneOS: Overlay Network Operating System

OneOS is a high-level middleware-based distributed operating system providing a single system image of a heterogeneous computer network. Each machine is represented as a resource within OneOS, and the OneOS Scheduler allocates jobs on the appropriate machines. Pipes can be created between processes similar to how it is done in UNIX systems; OneOS pipes are created over TCP.

* [Poster](http://ece.ubc.ca/~kumseok/assets/OneOS-Poster-EuroSys19.pdf), [Abstract](https://www.eurosys2019.org/wp-content/uploads/2019/03/eurosys19posters-abstract72.pdf), and [Demo Video (No Sound)](http://ece.ubc.ca/~kumseok/assets/OneOS-Demo-EuroSys19.mp4) - [EuroSys2019](https://www.eurosys2019.org/accepted-posters/)


## Usage

The package comes with 2 CLI commands:

* `oneosd` starts the OneOS Runtime Daemon, which, collectively with other daemons, maintain the underlying IPC infrastructure and the core system services (file-system service, shell service, etc).
* `oneos` starts the OneOS Shell Client, which is basically a thin end-user terminal for talking to the system.


**Example**

On Machine A:
```
~$ oneosd my-runtime-A
```

On Machine B:
```
~$ oneosd my-runtime-B
```

On Machine C:
```
~$ oneosd my-runtime-C
```

The second argument above is the ID to assign the runtime, and it is optional. If not specified, it will generate a random `uuid/v4` and then save the generated ID for future use in the `.oneos` directory under the user's home directory. If the second argument is omitted, the ID in `.oneos` configuration directory will be used. To run multiple runtimes on the same machine, the second argument must be provided to avoid ID conflict.

Upon starting the runtimes, they will discover each other through a simple membership protocol over the Publish/Subscribe network. Then following a simple consensus protocol, the runtimes will decide which will run which core service. The core services are analogous to the services started by `init` in Unix, and they are: FileSystem, Scheduler, Shell, WebServer.

Once the core services are running, the system has "booted" and is ready to be used.

On any machine:
```
~$ oneos
```

The user is now interacting with the system through the terminal.


## License

MIT
