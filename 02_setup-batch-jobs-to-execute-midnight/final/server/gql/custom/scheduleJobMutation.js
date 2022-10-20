import { GraphQLNonNull, GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLBoolean } from 'graphql';
import { getQueue, QUEUE_NAMES } from '@utils/queue';
import moment from 'moment';

export const scheduleJob = {
  type: new GraphQLObjectType({
    name: 'ScheduleJob',
    fields: () => ({
      success: {
        type: GraphQLNonNull(GraphQLBoolean),
        description: 'Returns true if the job was scheduled successfully'
      }
    })
  }),
  args: {
    scheduleIn: {
      type: GraphQLNonNull(GraphQLInt),
      description: 'Milliseconds from now that the job should be scheduled'
    },
    message: {
      type: GraphQLNonNull(GraphQLString),
      description: 'Message that should be consoled in the scheduled job'
    }
  },
  async resolve(source, args, context, info) {
    // 1
    return getQueue(QUEUE_NAMES.SCHEDULE_JOB)
      .add({ message: args.message }, { delay: args.scheduleIn })
      .then(job => {
        // 2
        console.log(`${moment()}::Job with id: ${job.id} scheduled in ${args.scheduleIn} milliseconds`);
        return { success: true };
      })
      .catch(err => {
        console.log(err);
        return { success: false };
      });
  },
  // eslint-disable-next-line no-template-curly-in-string
  description: 'Schedule a job that will be executed in ${scheduleIn} milliseconds. This job will console ${message}.'
};
