FROM ghcr.io/lavalink-devs/lavalink:4

# Railway injects $PORT at runtime; Lavalink reads server.port from
# application.yml, so we translate it via an env var Spring can pick up
# directly (see application.yml's ${SERVER_PORT:2333}).
ENV SERVER_PORT=2333

COPY application.yml /opt/Lavalink/application.yml

WORKDIR /opt/Lavalink

EXPOSE 2333

ENTRYPOINT ["java", "-jar", "Lavalink.jar"]
