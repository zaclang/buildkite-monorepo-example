
## buildkite-monorepo-example

* Single commit to deploy any number of services from a single repo

* Services define their own build & deploy stages

* Single click to release all changed services

* e2e suite runs after all deployments complete


### flow:

```
foo-service \                                        / build foo-service -------- \  /- deploy foo-service (staging) -\                  / deploy foo-service (prod) \
             -> detect changes -> trigger services ->                              --                                  -> e2e-staging -->                             -> e2e-prod
bar-service /                                        \ build & test bar-service - /  \- deploy bar-service (staging) -/                  \ deploy bar-service (prod) /
```


### Adding a new service:

* [Example:](https://github.com/zaclang/buildkite-monorepo-example/commit/9403c0dc2525c95f466cb17b577d4dcc9497a780)


### TODO:

* Unit test important stuff like dynamic template output

* Rather than comparing changes with the previous commit, store the deployed commit sha and diff between releases

* Once Buildkite supports it (allegedly soon...), initialise new pipelines automatically based on the `.buildkite/project.json`
