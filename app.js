const amqp = require('amqplib');

const readline = require('readline');
const config = require('./config');

// create a random user id
const randomUserId = Math.random().toString(36).substring(2) + Date.now().toString(36);

async function sendFanoutMessage(message) {
  try {
    // Connect to RabbitMQ server
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    // Declare a fanout exchange
    const exchangeName = 'logs';
    await channel.assertExchange(exchangeName, 'fanout', { durable: false });

    const payload = {
      userId:randomUserId,
      message
    }

    // Publish the message to the fanout exchange
    channel.publish(exchangeName, '', Buffer.from(JSON.stringify(payload)));

    console.log(` [x] Sent: ${message}`);

    // Close the connection
    setTimeout(() => {
      connection.close();
    }, 500);
  } catch (error) {
    console.error('Error:', error.message);
  }
}


async function receiveFanoutMessages() {
  try {
    // Connect to RabbitMQ server
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    // Declare a fanout exchange
    const exchangeName = 'logs';
    await channel.assertExchange(exchangeName, 'fanout', { durable: false });

    // Declare a non-durable exclusive queue with a generated name
    const { queue } = await channel.assertQueue('', { exclusive: true });

    // Bind the queue to the fanout exchange
    await channel.bindQueue(queue, exchangeName, '');


    // Consume messages from the queue
    channel.consume(queue, (data) => {
      const payload = JSON.parse(data.content.toString());
      const { userId,message } = payload;
      if (message !== null && userId!==randomUserId) {
        console.log('\x1b[32m%s\x1b[0m',` [x] Received: ${message}`);
      }
    }, { noAck: true }); // Setting noAck to true to automatically acknowledge messages

  } catch (error) {
    console.error('Error:', error.message);
  }
}


// Call the function to receive messages
// receiveMessage();
receiveFanoutMessages();


function createInputMessage(){
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Enter something: ', (answer) => {
    console.log(`You entered: ${answer}`);
    sendFanoutMessage(answer);
    rl.close();
    createInputMessage();
  });
}

createInputMessage()