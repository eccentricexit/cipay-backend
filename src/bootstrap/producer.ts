import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'backend',
  brokers: [`${process.env.KAFKA_HOSTNAME}:${process.env.KAFKA_BROKER_PORT}`],
});

export default kafka.producer();
