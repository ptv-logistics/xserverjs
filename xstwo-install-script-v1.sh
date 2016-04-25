#!/bin/sh

# force the script to fail after the first error. Hint taken from here:
# http://stackoverflow.com/questions/2870992/automatic-exit-from-bash-shell-script-on-error

set -e


# ----------------------------------------------------------------------------------------------------------------------------------------------------------

#
# Install missing packages
#

sudo apt-get update

sudo apt-get install -y unzip 

sudo apt-get install -y nodejs
sudo apt-get install -y npm
sudo npm install -g azure-cli 

# ----------------------------------------------------------------------------------------------------------------------------------------------------------

#
# Mount map
#

echo $1

azure --version

# azure vm disk attach --subscription "47471701-c024-4696-bb5b-8b1165d9eccb" --resource-group $1res --vm-name $1vm0 http://$1stg.blob.core.windows.net/vhds/m_world_t_2015_1_v5.vhd
