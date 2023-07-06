import bunyan from 'bunyan';
import apm from 'elastic-apm-node';

const logger = bunyan.createLogger({
    name: 'zeebe-worker',
    level: 'info',
});

const agent = apm.start({
    logger,
});

import { ZBClient } from 'zeebe-node';

(async () => {
    const transaction = agent.startTransaction('zeebe-starter');
    const traceparent = agent.currentTraceparent ?? transaction?.ids['trace.id'];
    const zbc = new ZBClient('localhost:26500', { stdout: logger });

    logger.info(`Initializing process instance with traceparent: ${traceparent}`);
    const result = await zbc.createProcessInstanceWithResult({
        bpmnProcessId: 'Process_1epg9ti',
        variables: {
            traceparent,
            customerId: 1,
        },
        requestTimeout: 25000,
    });

    logger.child({ context: result }).info('Process result');

    transaction?.end();
})()
