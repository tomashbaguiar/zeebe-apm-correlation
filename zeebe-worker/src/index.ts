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
import { CustomerService } from './services/customer.service';

const zbc = new ZBClient('localhost:26500', { stdout: logger });

zbc.createWorker({
    taskType: 'get-customer-size',
    taskHandler: job => {
        const traceparent: string = job.variables.traceparent;
        const transaction = agent.startTransaction('first-zeebe-worker', { childOf: traceparent });

        try {
            logger.info(job.variables);

            if (!job.variables.customerId) {
                throw new Error();
            }

            const customerService = new CustomerService();
            const customerSize = customerService.getSizeFromId(job.variables.customerId);

            transaction?.setOutcome('success');

            return job.complete({
                customerSize,
            });
        } catch (error) {
            transaction?.setOutcome('failure');
            return job.error('NO_CUSTID', 'Missing customerId in process variables');
        } finally {
            transaction?.end();
        }
    },
    onReady: () => logger.info('First worker connected!'),
    onConnectionError: () => logger.error('First worker disconnected!'),
});

zbc.createWorker({
    taskType: 'get-customer-id',
    taskHandler: job => {
        const traceparent: string = job.variables.traceparent;
        const transaction = agent.startTransaction('second-zeebe-worker', { childOf: traceparent });

        try {
            logger.info(job.variables);

            if (!job.variables.customerSize) {
                throw new Error();
            }

            const customerService = new CustomerService();
            const customerId = customerService.getIdFromSize(job.variables.customerSize);

            return job.complete({
                customerId,
            });
        } catch (err) {
            transaction?.setOutcome('failure');
            return job.error('NO_CUSTSIZE', 'Missing customerSize in process variables');
        } finally {
            transaction?.end();
        }
    },
    onReady: () => logger.info('Second worker connected!'),
    onConnectionError: () => logger.error('Second worker disconnected!'),
});
