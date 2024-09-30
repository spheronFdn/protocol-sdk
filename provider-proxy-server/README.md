# Provider Proxy Server

This proxy server acts as an intermediary for fetching data related to your deployment from the Spheron Provider. The server handles both HTTP and WebSocket requests to communicate with the Spheron provider. You can either run the server using a Docker image or set it up manually using the source code in this repository. 

Table of Contents
-----------------

1.  [Option 1: Use the Docker Image](#option-1-use-the-docker-image)
2.  [Option 2: Run from Source Code](#option-2-run-from-source-code)
3.  [Environment Variables](#environment-variables)
4.  [Health Check](#health-check)

* * *

Option 1: Use the Docker Image
------------------------------

You can run the provider proxy server easily using the Docker image. Follow the below steps to run the container.

### 1\. Pull the Docker Image

Pull the Docker image from Docker Hub using the following command:

```bash
docker pull spheronnetwork/provider-proxy-server:latest
```

### 2\. Run the Docker Container

Run the container, mapping port `3040` to your local machine:

```bash
docker run -p 3040:3040 spheronnetwork/provider-proxy-server:latest
```

This will start the server, and it will be accessible on `http://localhost:3040`.


Option 2: Run from Source Code
------------------------------

If you'd prefer to run the server manually from the source code, follow these steps:

### 1\. Clone the Repository

Clone the repository containing the `provider-proxy-server`:

```bash
git clone https://github.com/spheronFdn/protocol-sdk.git
```

Navigate to the `provider-proxy-server` directory:

```bash
cd ./provider-proxy-server
```

### 2\. Install Dependencies

Ensure you have Node.js installed. Install the required dependencies:

```bash
npm install
```

### 3\. Set Environment Variables

Create a `.env` file or set the environment variables directly. The default port is `3040`. You can change the port by modifying the `.env` file:

```bash
PORT=3040
```

### 4\. Start the Server

Start the server by running:

```bash
npm run start
```

The server will now be running on `http://localhost:3040`.


Environment Variables
---------------------

*   **PORT**: The port on which the server will run (default: `3040`).

    To use a custom port, set the `PORT` environment variable before running the container or server.

Example:

```bash
PORT=8080
```


Health Check
------------

To verify if the server is running, use the following endpoint:

*   **GET /health**

```bash
curl http://localhost:3040/health
```

Expected response: `OK` (HTTP 200)
