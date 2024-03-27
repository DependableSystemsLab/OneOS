# OneOS: Overlay network Operating System

**OneOS** is a distributed operating system based on the "*pseudokernel*" architecture.
The "*pseudokernel*" is realized by a network of communicating middleware services, which collectively *appears as a single POSIX-based operating system*.
The distributed middleware network is organized in a similar manner to many other distributed platforms/frameworks such as Kubernetes, Kafka, Flink, etc., with the control-plane components performing system-level orchestration tasks such as job placement.
The difference between OneOS and the other systems mentioned is that OneOS preserves the POSIX interface facing the applications, allowing unmodified user applications to run in a distributed setting. This means that the user *does not need to write* "OneOS apps". Instead, OneOS adopts the flow-based programming model, popular in many distributed application paradigms (e.g., serverless, stream-processing). A user can simply connect different POSIX processes using the familiar POSIX API such as files and sockets. For example, one can simply pipe the `stdout` of a OneOS process to the `stdin` of another.


## Getting Started

### Repository Organization

Here we briefly describe the organization of this repository, for those who want to work with the source code. If you simply want to run OneOS, you can skip ahead to the installation section.

```
/src
    /OneOS
    /OneOS-Core
    /OneOS-WebTerminal
```

* `src` directory contains the source code. OneOS is written mainly in C#, with some components written in JavaScript. Inside it, you will find the `OneOS.sln` file, which is the Visual Studio solution file that you can load into Visual Studio.
    * `OneOS` directory contains most of the core OneOS components.
    * `OneOS-Core` directory contains just a single "main" file to be compiled into the OneOS CLI.
    * `OneOS-WebTerminal` directory contains the web-based GUI -- the "OneOS Desktop" -- written in JavaScript (using `express` and `vue`).


### Installation

The quickest way to install OneOS is to download one of the compiled binaries from the [releases](https://github.com/DependableSystemsLab/OneOS/releases) page. Download the appropriate binary for your platform. Once downloaded, change the name of the binary and make it executable by running:

```
mv oneos-linux-x64 oneos
chmod +x oneos
```

Then, you will need to configure OneOS before you run it for the first time. Run the following command to begin the interactive configuration process:
```
./oneos config
```

We include a sample exchange below -- make sure you change the values as necessary.

```

```
A configuration file will be created in the `~/.oneos` directory.

Finally, you can test your installation by spinning up a local test cluster and logging into it through the OneOS shell.
Start the local test cluster by entering the following:
```
./oneos cluster
```

If this is the first time running the test cluster, you should see some directories being created and some NPM packages being installed. Then, you should see the nodes in the test cluster exchanging some initial handshakes. After you start the cluster, you can log in to OneOS using the OneOS shell:

```
./oneos shell
```

Once inside the shell environment, you can navigate using traditional Linux commands (*note: we currently support a limited set of common commands for navigating the file system and monitoring the system. Common Linux programs such as vim are not available.*)


## Publications

Here are some of the publications and other materials that discuss OneOS in more depth:

* Conference Paper (IoTDI 2024) - Available in May 2024
* [Conference Paper (SEC 2021)](https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=9708969&casa_token=YqZL8J6f7fcAAAAA:z4GjMAaI_v5ERFvP_9n6UTcVG70h5UDIxbU5an_77bg4HJqyV9FUjgmPl-obbzhK8-MGKf7j&tag=1)
* [Poster (EuroSys 2019)](http://ece.ubc.ca/~kumseok/assets/OneOS-Poster-EuroSys19.pdf), [Abstract](https://www.eurosys2019.org/wp-content/uploads/2019/03/eurosys19posters-abstract72.pdf), and [Demo Video (No Sound)](http://ece.ubc.ca/~kumseok/assets/OneOS-Demo-EuroSys19.mp4) - [EuroSys2019](https://www.eurosys2019.org/accepted-posters/)
* [Workshop Paper (HotEdge 2019)](https://www.usenix.org/system/files/hotedge19-paper-jung_0.pdf), [Slides](https://www.usenix.org/sites/default/files/conference/protected-files/hotedge19_slides_jung.pdf)
* [Web Desktop Demo Video](http://ece.ubc.ca/~kumseok/assets/OneOS-2020Jan.mp4)

*Note:* The code had a major rewrite in 2021, so the UI you see in demos and posters from before 2021 will look different from the current version.


## License

MIT