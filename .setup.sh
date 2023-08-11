#!/bin/bash
#set -x

db_file='.remoted.db'

[[ -s "$db_file" ]]&&{ echo "Found sqlite db file, aborting...";exit 1;}
cat > /tmp/$0_$$.sql <<"EOF"

create table users(
	user_name text not null unique,
	password_hash text not null primary key
);

-- No constraints on logs, we don't ever want an INSERT into this table to fail.
create table logs(
	log_date integer,
	user_name text,
	ip text,
	user_agent text,
	action text,
	log_message text
);

EOF

sqlite3 -init / "$db_file" < /tmp/$0_$$.sql

add_user(){

	read -r -p "Enter your username: " user

	while (( ${#password} < 10 ));do
		[[ -n "$password" ]]&& echo "That password is too short, please make it at least 10 characters long."
		read -s -r -p "Enter a password: " password
		echo
	done

	 i=1337;
	 pwhash="$password"
	 while((i--));do
	 	pwhash=$(echo -n "$pwhash"|sha256sum |while read -r hash junk;do echo $hash;done);
	done

	sql="insert into users values('$user','$pwhash');"
	sqlite3 -init / "$db_file" <<< "$sql"
	unset password
}


echo "Add user(s)."
until [[ $option == [Nn] ]];do
	add_user
	read -r -p "Add another [y/N]? " option
	option=${option:-N}
done


echo "Attempting to locate dash.conf..."
find / -name dash.conf 2>/dev/null|
while read -r path;do
	[[ -s "$path" ]]&&ln -sf "$path" .dash.conf
done


# Note:  This will create a new empty wallet with default params and enable it for
# automatic loading at startup.
# dash-cli createwallet wallet false false "" false true

# It looks like the only way to enable CJ multisession is via the startup params.
# So, be sure to add this line to dash.conf.
# coinjoinmultisession=1




# The dash.conf file that I used during testing.

# testnet=1
# listen=1
# server=1
# daemon=1
# prune=1000
# paytxfee=0.00001
# ##########################
# coinjoinmultisession=1
# coinjoinsessions=8
# coinjoinrounds=14
# ##########################
# rpcuser=X
# rpcpassword=Y
# [test]
# rpcport=19998





echo "Done!"
