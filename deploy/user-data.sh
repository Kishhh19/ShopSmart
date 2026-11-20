#!/bin/bash
# EC2 user data (first boot). Downloads the bootstrap from the private release bucket and runs it.
# Output: /var/log/shopsmart-bootstrap.log
BUCKET=__BUCKET__
KEY=__KEY__
exec > >(tee -a /var/log/shopsmart-bootstrap.log) 2>&1
aws s3 cp "s3://$BUCKET/bootstrap.sh" /root/bootstrap.sh && bash /root/bootstrap.sh "$BUCKET" "$KEY"
