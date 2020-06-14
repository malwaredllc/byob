## Contributing

All contribution are welcome even not tech one. To contribute you need to fork, then clone the repo:

```
git clone git@github.com:your-name/jquery.terminal.git
```

Please only modify `js/jquery.terminal-src.js`/`css/jquery.terminal-src.css` files. You can run `make`, but you may have conflicts others push commits with their build (you may have conflict because there is build date/time in build file) make sure you're on devel branch and create PR to devel brach as well, fixes to examples and README can be made directly to master but they could also be made to devel.

Non tech contribution are also welcome, if you find a bug in documentation on the website you can file an issue to [jcubic/jquery.terminal-www](https://github.com/jcubic/jquery.terminal-www).


## List of contributors with avatars

To update the list, the script need to be run when change is merged to master and since all merges are done on
devel. I need to run the script when I'm releasing new version. To help me remember, if this is yours first
contribution, please modify template/Makefile.in and update line `UPDATE_CONTRIBUTORS=1` it should be 1 which
is true (0 is false). On each build it will show red reminder message and it will stop build when run on master.


## Test

You should run test to make sure you don't break anything, to run tests from browser you need to run

```
npm install
make test
```

and run ESlint and JSONLint using:

```
make lint
```
you can also run test coverage using

```
make coverage
```

## README

if you want to modify readme please modify the one in templates directory because that one is source file with {{VER}}
markers that get filled with current version when running `make`.
