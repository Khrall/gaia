#!/bin/bash

# yarn run build
rsync -r build/ $1:/home/admin/projects/frontend/ --delete
