
## buildkite-monorepo-example

* Single commit to deploy any number of services from a single repo

* Services define their own build & deploy steps

* Single click to release all changed services

* e2e suite runs after staging deployments complete, and again after prod deployment


### Release flow:

```
foo-service  \                                         / build foo-service -------- \  /- deploy foo-service (staging) -\                  / deploy foo-service (prod) \
               -> detect changes -> trigger services ->                              --                                  -> e2e-staging -->                             -> e2e-prod
bar-service  /                                         \ build & test bar-service - /  \- deploy bar-service (staging) -/                  \ deploy bar-service (prod) /
            /                                           \                          /
baz-service/                                             \ build baz-service -----/
```

### Setup:

* Create a new pipeline for your repo, with the following command step:

```
node .buildkite/pipeline.js | buildkite-agent pipeline upload
```

* Register your subdirectories/services in `.buildkite/registered.json`

* Trigger a build that includes a change to your subdirectories


### Adding a new service:

* [Example commit](https://github.com/zaclang/buildkite-monorepo-example/commit/9403c0dc2525c95f466cb17b577d4dcc9497a780)


### Testing locally:

```
node .buildkite/lib/detect-changes.js $(git rev-parse --verify HEAD~1)
```


```
node .buildkite/lib/trigger.js changes.sample.json
```

### TODO:

* Unit test important stuff like dynamic template output

* Rather than comparing changes with the previous commit, store the deployed commit sha and diff between releases

