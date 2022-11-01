import express from 'express';
import graphqlHTTP from 'express-graphql';
import dotenv from 'dotenv';

import { connect } from '@database';
import rTracer from 'cls-rtracer';

import { QueryRoot } from '@gql/queries';
import { MutationRoot } from '@gql/mutations';
import { isTestEnv, logger } from '@utils/index';

import { initQueues } from '@utils/queue';

import cors from 'cors';
import { SubscriptionServer } from 'subscriptions-transport-ws/dist/server';
import { GraphQLSchema, execute, subscribe } from 'graphql';
import 'whatwg-fetch';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import { SubscriptionRoot } from '@gql/subscriptions';

let app;
export const init = async () => {
  // configure environment variables
  dotenv.config({ path: `.env.${process.env.ENVIRONMENT}` });

  // connect to database
  connect();

  // create the graphQL schema
  const schema = new GraphQLSchema({ query: QueryRoot, mutation: MutationRoot, subscription: SubscriptionRoot });

  if (!app) {
    app = express();
  }

  app.use(rTracer.expressMiddleware());
  app.use(cors());

  app.use(
    '/graphql',
    graphqlHTTP({
      schema: schema,
      graphiql: true,
      customFormatErrorFn: e => {
        logger().info({ e });
        return e;
      }
    })
  );

  app.use('/', (req, res) => {
    const message = 'Service up and running!';
    logger().info(message);
    res.send(message);
  });
  /* istanbul ignore next */
  if (!isTestEnv()) {
    const httpServer = createServer(app);
    const server = new ApolloServer({
      schema
    });
    await server.start();
    server.applyMiddleware({ app });
    // 2
    const subscriptionServer = SubscriptionServer.create(
      { schema, execute, subscribe },
      { server: httpServer, path: server.graphqlPath }
    );
    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, () => subscriptionServer.close());
    });
    httpServer.listen(9000, () => {
      console.log(`Server is now running on http://localhost:9000/graphql`);
    });
    initQueues();
  }
};

logger().info({ ENV: process.env.NODE_ENV });

init();

export { app };
