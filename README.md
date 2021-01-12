This service takes a signature (transfering DAI from user to cipay) + PIX qrcode and pays the QR Code.

# Kafka Setup Instructions

```
# Install JDK.
sudo apt update && \
sudo apt install openjdk-11-jdk -y

# Create kafka user and login
sudo chomod +x kafka-setup-2.sh && \
sudo useradd kafka -m && \
sudo passwd kafka && \
sudo adduser kafka sudo && \
sudo chsh -s /bin/bash kafka
su -l kafka

# Create dirs
mkdir Downloads && \
curl "https://mirror.efect.ro/apache/kafka/2.7.0/kafka_2.13-2.7.0.tgz" -o ~/Downloads/kafka.tgz && \
mkdir ~/kafka && cd ~/kafka && \
tar -xvzf ~/Downloads/kafka.tgz --strip 1 && \
printf 'log.retention.hours=-1\nlog.retention.bytes=-1' | sudo tee ~/kafka/config/server.properties && \
exit && \
sudo printf '[Unit]\nRequires=network.target remote-fs.target\nAfter=network.target remote-fs.target\n[Service]\nType=simple\nUser=kafka\nExecStart=/home/kafka/kafka/bin/zookeeper-server-start.sh /home/kafka/kafka/config/zookeeper.properties\nExecStop=/home/kafka/kafka/bin/zookeeper-server-stop.sh\nRestart=on-abnormal\n[Install]\nWantedBy=multi-user.target' | sudo tee /etc/systemd/system/zookeeper.service && \
sudo printf '[Unit]\nRequires=zookeeper.service\nAfter=zookeeper.service\n[Service]\nType=simple\nUser=kafka\nExecStart=/bin/sh -c '\''/home/kafka/kafka/bin/kafka-server-start.sh /home/kafka/kafka/config/server.properties > /home/kafka/kafka/kafka.\nog 2>&1'\''\nExecStop=/home/kafka/kafka/bin/kafka-server-stop.sh\nRestart=on-abnormal\n[Install]\nWantedBy=multi-user.target' | sudo tee /etc/systemd/system/kafka.service && \
sudo systemctl enable kafka && \
sudo systemctl start kafka && \
sudo journalctl -u kafka

# Remove kafka from sudoers and lock the account
sudo deluser kafka sudo
sudo passwd kafka -l

# To login, you need sudo
sudo su - kafka

# To remove the lock, you can use:
sudo passwd kafka -u

Source: https://www.digitalocean.com/community/tutorials/how-to-install-apache-kafka-on-ubuntu-18-04
```
