FROM mhart/alpine-node

ARG JWT_NAME
ENV JWT_NAME=$JWT_NAME
ARG NAMESPACE
ENV NAMESPACE=$NAMESPACE

WORKDIR /app
COPY . .
RUN npm ci
EXPOSE 9000
EXPOSE 8080
CMD [ "sh", "-c", "node proxy.js 9000 8080 --silent --jwt ${JWT_NAME} --namespace ${NAMESPACE}" ]
