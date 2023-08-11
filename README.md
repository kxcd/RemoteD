# RemoteD


## A remote controller for your Dashd.



RemoteD will allow you to access your Dash Core Wallet from anywhere in the world via a secure https connection without you risking your keys on random devices, simply log in to your instance of RemoteD and it connects to your wallet on your local machine, eg Raspberry Pi and gives you access to your funds from there.  You can control the wallet, eg, start/stop mixing, restart the daemon and of course send and receive funds.


### Hardware Requirements

To successfully host the RemoteD you will need the following.

- A Raspberry Pi 4b (8GB).
- Always on internet connection, preferably with static IP.
- MicroSD 128GB or larger.


### Software Requirements

To run RemoteD you will need

- Apache, Nginx or lighttpd (Apache preferred).
- PHP 8.1 or better.
- SQLite3.
- Latest version of Dash Core (19.3 currently).


### Setup

1. Install Raspberry Pi OS 64 bit to the Pi using the standard tools for imaging of an SD card. Recommend the lite one https://www.raspberrypi.com/software/operating-systems/#raspberry-pi-os-64-bit
2. Configure your router to assign a static IP to your Pi according to its MAC address.
3. Configure your router to port forward port 80 and 443 to your Raspberry Pi.
4. On the pi install and run the Dash Masternode Zeus also available on this github account kxcd https://github.com/kxcd/Masternode-Zeus.  When prompted for a BLS key leave it as blank for the default.  Once the DMZ is done, use the option to edit the dash.conf and comment out the `masternodeblsprivkey` line while adding the additional parameters from .setup.sh.  It is advised to NOT run the node in pruned mode unless you really must.
5. On the pi install lighttpd, PHP-8.1, SQLite3 and certboteg `sudo apt install lighttpd php-fpm php8.1-curl php8.1-sqlite3 sqlite3 certbot`
6. Checkout this repo in the /var/www/html/ directory `git clone https://github.com/kxcd/RemoteD/`
7. Run the .setup.sh eg `cd /var/www/html/RemoteD && ./.setup.sh`.  Now also delete the .git directory, eg `rm -fr /var/www/html/RemoteD/.git`. Set the permission on `.remoted.db` to be world readable ie `chmod 666 /var/www/html/RemoteD/.remoted.db` and verify that the .dash.conf does point to a valid dash.conf, ie `cat .dash.conf` if it doesn't, just delete it and create a new one with the contents of your dash.conf file.
8. Sign up for a free Dynamic DNS provider, eg https://www.dynu.com/ and create hostname for your IP.
9. Use certbot to get a TLS(SSL) cert for your Pi `sudo certbot certonly --standalone -d your-domain.com` replacing the domain with your domain from the dynamic DNS provider, make sure the httpd is down at this time. eg `sudo systemctl restart lighttpd.service`
10. If using lighttpd enable ssl with `sudo lighttpd-enable-mod ssl` ensure it is down `sudo systemctl stop lighttpd.service`
11. Configuring the httpd, in this case lighttpd. In `/etc/lighttpd/lighttpd.conf` comment out `server.upload-dirs` line, change `server.port` to 443, comment out the line `include_shell "/usr/share/lighttpd/use-ipv6.pl " + server.port`.  In the file `/etc/lighttpd/conf-enabled/10-ssl.conf` edit the line to look like this `$SERVER["socket"] == "0.0.0.0:443"{ ssl.engine = "enable" }` ensure these two lines are present/updated

```
ssl.pemfile = "/etc/letsencrypt/live/your-domain.com/fullchain.pem"
ssl.privkey = "/etc/letsencrypt/live/your-domain.com/privkey.pem"
```

Change the placeholder `your-domain.com` for your actual domain from the Dynamic DNS service.


12. Start the httpd and test the connection from a browser, it should work now. `sudo systemctl start lighttpd.service`.  Create a dummy file to test with `echo test >/var/www/html/index.html`.
13. Enable php in lighttpd `sudo lighttpd-enable-mod fastcgi-php-fpm` and restart the service, `sudo systemctl restart lighttpd.service`. Test it with a dummy php page, eg, `echo '<?php phpinfo(); ?>'>/var/www/html/zzz_phpinfo.php` and load it from your browser, you should see the php info page.  If you do, head on to the next step to configure php.
14. In the file `/etc/php/8.1/fpm/php.ini` change the error reporting line to `error_reporting = E_ALL`. Once all changes are done restart the php with `sudo systemctl restart php8.1-fpm.service`and `sudo systemctl restart lighttpd.service`  and verify the phpinfo page, on that page search on `sqlite3` and verify it is enabled, search on `curl` and verify it too is enabled, then delete that page from `/var/www/html/` and the other test page you made.
15. Test the RemoteD site, it should now load.


