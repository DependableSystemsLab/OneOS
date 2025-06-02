
```markdown
#  Getting Started with OneOS

##  Overview

**OneOS** is a distributed operating system based on a **pseudokernel** architecture. The pseudokernel is implemented as a network of communicating middleware services, which collectively appear as a single POSIX-based operating system.

The architecture is similar to platforms like **Kubernetes**, **Kafka**, and **Flink**, including control-plane components for orchestration tasks such as job placement. However, OneOS distinguishes itself by **preserving the POSIX interface**, allowing unmodified user applications to run in a distributed environment.

OneOS supports flow-based programming via familiar POSIX APIs (e.g., files, sockets). For example:

```bash
oneos-cat file.txt | oneos-grep "error"
````

---

##  Repository Structure

If you're planning to build or contribute to OneOS, here's how the repository is structured:

```
/src
├── /OneOS               # Core system components
├── /OneOS-Core          # CLI entry point
├── /OneOS-WebTerminal   # Web-based GUI (OneOS Desktop)
OneOS.sln                # Visual Studio solution file
```

*  Core system: **C#**
*  Web interface: **JavaScript (Vue + Express)**

---

##  Installation (Windows)

### 1.  Download the Release

Visit the [Releases](#) page and download the binary appropriate for your system.

> **Virus Detection Warning**  
> If you get a `"Failed - Virus detected"` error:  
>   
> • Go to `Windows Security > Virus & Threat Protection > Manage Settings`  
> • Temporarily **disable** Real-time protection  
> • Download and **exclude the file from protection**  
> • Re-enable Real-time protection if needed  

---

### 2.  Prepare the Binary

Move the downloaded file to a safe location, such as:

```plaintext
C:\OneOS\bin\
```

Rename the binary to:

```plaintext
oneos.exe
```

---

### 3.  Add to PATH

To run `oneos` from any terminal:

1. Open **System Properties** > **Environment Variables**
2. Under **System Variables**, find and edit `Path`
3. Add the following entry:

```plaintext
C:\OneOS\bin\
```

---

### 4.  Test the Installation

Open **Command Prompt** and type:

```bash
oneos
```

Expected output:

```plaintext
Example: oneos host -mount=/home/user/.oneos

Available commands:
host
    Start the OneOS Runtime service on this machine, joining the OneOS cluster
    specified in the configuration file.

    Usage Example:
        oneos host -mount=/home/user/.oneos
```

---

##  Configuration

### 5.  Run Configuration Wizard

Run the following:

```bash
oneos config
```

You’ll be prompted to set up:

* Node ID
* VM and IO agent settings
* Memory and disk allocation

This creates a configuration file at:

```plaintext
~/.oneos
```

---

##  Running OneOS

### 6.  Start the Shell

In a terminal:

```bash
oneos shell
```

This installs dependencies and initializes the shell environment.

---

### 7.  Start a Local Cluster

In a **new** terminal:

```bash
oneos cluster
```

The command will hang to keep the local cluster running.

Then, in a **third** terminal:

```bash
oneos shell 127.0.0.1:8000
```

Enter credentials when prompted:

```
Username: root
Password: password
```

 You are now inside the OneOS environment and can run distributed POSIX-style applications!

---

##  Additional Resources

###  Publications

* **IoTDI 2024** – *ImmunoPlane: Middleware for Providing Adaptivity to Distributed Internet-of-Things Applications*
* **SEC 2021** – *OneOS: Middleware for running edge computing applications as distributed POSIX pipelines*
* **Middleware 2021** – *OneOS: A distributed operating system for the Internet of Things*
* **EuroSys 2019** – Poster, abstract, and demo video *(no sound)*
* **HotEdge 2019** – Workshop paper and slides

### 🎥 Demo

* [Web Desktop Demo Video](#)

>  **Note:** The OneOS UI was significantly updated in 2021. Older demos may not reflect the current interface.

---

##  License

This project is licensed under the [MIT License](LICENSE).

---


