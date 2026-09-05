const prepData = [
  {
    "phase": "Phase 1: Project Deep-Dives",
    "categories": [
      {
        "title": "Distributed Code Engine",
        "questions": [
          {
            "id": 1,
            "question": "Can you explain the architecture of your Distributed Code Engine from client request to execution result?",
            "answer": "The client sends code via an HTTP POST request to the Spring Boot REST API. The `CodeController` hands the request to a `ThreadPoolTaskExecutor` using a `CompletableFuture` for async processing. A `DockerSandboxService` then allocates a pre-warmed Docker container (C++, Java, or Python), maps the code via stdin, executes it, captures stdout/stderr, and returns the `ExecutionResult` back through the API."
          },
          {
            "id": 2,
            "question": "Why did you choose Spring Boot over Node.js, Go, or Python for this specific backend?",
            "answer": "Spring Boot natively handles multithreading very well through its underlying Tomcat server and thread pools, which is crucial for concurrent execution tasks. Java's robust `CompletableFuture` and `ThreadPoolTaskExecutor` provide fine-grained control over concurrency (like backpressure) that is harder to achieve in Node.js's single-threaded event loop."
          },
          {
            "id": 3,
            "question": "How exactly does `CallerRunsPolicy` act as a natural backpressure system in your application?",
            "answer": "When the `ThreadPoolTaskExecutor` reaches its maximum pool size and the task queue is full, the `CallerRunsPolicy` forces the thread that submitted the task (the Tomcat HTTP thread) to execute the task itself. This blocks the HTTP thread from accepting new requests, inherently throttling incoming traffic and preventing the server from running out of memory."
          },
          {
            "id": 4,
            "question": "What would happen to your server if you used `AbortPolicy` or `DiscardPolicy` instead of `CallerRunsPolicy` under heavy load?",
            "answer": "`AbortPolicy` would throw a `RejectedExecutionException`, causing the server to return 500 errors to users immediately. `DiscardPolicy` would silently drop the code execution requests, leading to users waiting indefinitely for a response that will never arrive."
          },
          {
            "id": 5,
            "question": "You mentioned keeping latency low with \"pre-warmed\" Docker containers. How is this pool managed in your Java code?",
            "answer": "I maintain a configurable pool (e.g., a `BlockingQueue` or a concurrent list) of container IDs that have already been created and started using the `docker-java` API. When a request comes in, a container is popped from the pool, used for execution, cleaned up, and then returned to the pool, completely bypassing the cold-start delay of `docker run`."
          },
          {
            "id": 6,
            "question": "How do you map incoming concurrent requests to an available pre-warmed container safely?",
            "answer": "By using a thread-safe data structure like an `ArrayBlockingQueue` for the container pool. When a thread needs a container, it calls `take()`, which blocks if no containers are available. Once finished, it calls `put()` to return it, ensuring no two threads use the same container simultaneously."
          },
          {
            "id": 7,
            "question": "How do you physically strip network access from the Docker containers programmatically?",
            "answer": "When creating the container via the `docker-java` API, I set the network mode to `none` (e.g., `--network none` in CLI). This ensures the container has no network interfaces other than the loopback, preventing users from making external API calls or launching DDoS attacks from within the sandbox."
          },
          {
            "id": 8,
            "question": "How did you determine that 256MB was the optimal memory cap? What happens exactly when a user submits a memory leak?",
            "answer": "256MB provides enough headroom for the JVM or Python runtime to start up and execute basic algorithms without starving the host machine, allowing for a higher density of concurrent containers. If a user code leaks memory, the Docker daemon's Cgroups limit kicks in, and the Linux OOM (Out Of Memory) Killer terminates the container process. The backend catches the exit code (usually 137) and returns a \"Memory Limit Exceeded\" error."
          },
          {
            "id": 9,
            "question": "How are you handling infinite loops submitted by the user? How is the timeout mechanism implemented?",
            "answer": "I implemented a timeout using Java's `CompletableFuture.orTimeout()` or by scheduling a timeout task. If the execution exceeds a threshold (e.g., 5 seconds), the backend uses the `docker-java` API to forcefully kill the container process, returning a \"Time Limit Exceeded\" error to the user."
          },
          {
            "id": 10,
            "question": "Can you explain how you use Java's `CompletableFuture` for asynchronous processing?",
            "answer": "I wrap the code execution logic in a `CompletableFuture.supplyAsync()`, passing it my custom `ThreadPoolTaskExecutor`. This frees up the Tomcat HTTP thread immediately (if using Spring WebFlux or DeferredResult) and allows the execution to happen in the background."
          },
          {
            "id": 11,
            "question": "How does your `CodeController` interact with the `ThreadPoolTaskExecutor` without blocking the main HTTP thread?",
            "answer": "The controller method returns a `CompletableFuture<ResponseEntity>` or `DeferredResult`. Tomcat threads handle the incoming HTTP request, hand the heavy Docker execution to the `ThreadPoolTaskExecutor`, and are immediately released back to the Tomcat pool to accept more HTTP connections."
          },
          {
            "id": 12,
            "question": "If a user submits C++ code, how is the compilation step sandboxed versus the execution step?",
            "answer": "Both occur within the same sandboxed container. First, `g++` is invoked via `docker exec` to compile the code. If successful, the compiled binary is executed in a subsequent `docker exec` command. This ensures the compiler itself cannot be exploited to harm the host machine."
          },
          {
            "id": 13,
            "question": "How did you securely pass the user's code to the Docker container (e.g., stdin vs file volume mapping)?",
            "answer": "File volume mapping can be risky and slow. Instead, I stream the code directly to a file inside the container using Docker's copy archive API, or pass it via standard input (stdin) during the compilation/execution `docker exec` command, keeping the host file system completely isolated."
          },
          {
            "id": 14,
            "question": "How do you capture the output (stdout/stderr) from the Docker container back to the Spring Boot application?",
            "answer": "The `docker-java` API provides an `ExecStartResultCallback` that allows me to attach input/output streams. I capture the `stdout` and `stderr` streams from this callback into a Java `ByteArrayOutputStream`, which is then converted to a string and sent back in the HTTP response."
          },
          {
            "id": 15,
            "question": "What were the specific bottlenecks you encountered when benchmarking to 130.64 requests/sec, and how did you measure this?",
            "answer": "I used JMeter/Apache Bench for load testing. The primary bottleneck was the host machine's CPU context switching and the Docker daemon's API limits when handling hundreds of concurrent `docker exec` commands. Pre-warming containers and using `CallerRunsPolicy` leveled this off to a stable 130 req/sec."
          }
        ]
      },
      {
        "title": "MiniRedis (In-Memory Key-Value Store)",
        "questions": [
          {
            "id": 16,
            "question": "Why did you decide to use bare-metal Java TCP sockets instead of an existing high-performance framework like Netty?",
            "answer": "I wanted to fundamentally understand how network I/O, threads, and socket buffers interact at a low level. While Netty abstracts away NIO and event loops efficiently, building it from scratch with `java.net.ServerSocket` exposed me to the raw challenges of blocking I/O and thread management."
          },
          {
            "id": 17,
            "question": "Can you walk me through the lifecycle of a single connection in your MiniRedis server?",
            "answer": "The main server thread listens on `ServerSocket.accept()`. When a client connects, it returns a `Socket` object. This socket is wrapped in a `Runnable` client handler and submitted to the `ExecutorService`. The handler reads the input stream (RESP protocol), parses the command, accesses the `ConcurrentHashMap`, writes the response to the output stream, and closes the socket when the client disconnects."
          },
          {
            "id": 18,
            "question": "You used an `ExecutorService` thread pool to hand off incoming connections. How did you size this pool?",
            "answer": "The pool size was based on the expected concurrent connections and hardware. Since blocking network I/O is thread-heavy (not CPU-heavy), I used a larger pool (e.g., a CachedThreadPool or FixedThreadPool of ~200) to ensure threads waiting on socket reads don't block CPU-bound tasks."
          },
          {
            "id": 19,
            "question": "What happens if 10,000 clients connect simultaneously? How does the OS handle the socket backlog?",
            "answer": "If the thread pool is exhausted, `ServerSocket.accept()` cannot be called fast enough. The OS places incoming TCP SYNs into the TCP backlog queue. If the backlog queue fills up, the OS starts dropping packets or sending TCP RST (connection refused), preventing the server application from crashing but failing client connections."
          },
          {
            "id": 20,
            "question": "Explain how `ConcurrentHashMap` achieves bucket-level locking and why that's crucial for your database.",
            "answer": "Unlike a regular `HashTable` that locks the entire map for every read/write, `ConcurrentHashMap` in Java 8+ uses CAS (Compare-And-Swap) for reads and locks only the specific array bucket (node) being written to. This allows thousands of parallel clients to read and write to different keys simultaneously without blocking each other."
          },
          {
            "id": 21,
            "question": "Why did you choose `ConcurrentHashMap` over `Collections.synchronizedMap` or a `ReadWriteLock`?",
            "answer": "`Collections.synchronizedMap` locks the entire object, causing massive contention. A `ReadWriteLock` allows concurrent reads but blocks all reads during a write. `ConcurrentHashMap` allows fully concurrent reads and concurrent writes to *different* buckets, making it vastly superior for a high-throughput key-value store."
          },
          {
            "id": 22,
            "question": "Have you implemented any eviction policies (like LRU/LFU)? If not, how would you design one?",
            "answer": "I would implement LRU (Least Recently Used) by combining a `ConcurrentHashMap` with a doubly-linked list. Since thread safety is required, I'd either use a lock-free linked list or partition the cache to reduce lock contention when updating the MRU (Most Recently Used) nodes."
          },
          {
            "id": 23,
            "question": "How do you handle parsing the Redis protocol (RESP)? Are you fully compliant with the Redis specification?",
            "answer": "I built a custom parser that reads the TCP input stream byte-by-byte, looking for RESP control characters (like `*` for arrays, `$` for bulk strings). It handles basic GET, SET, DEL commands. It may not support the full Redis spec (like Pub/Sub or transactions) but handles the core string-based commands accurately."
          },
          {
            "id": 24,
            "question": "What happens if a client sends a partially formed command over TCP? How do you buffer the input stream?",
            "answer": "TCP is a streaming protocol, so messages can be fragmented. I wrap the `Socket.getInputStream()` in a `BufferedReader` or `BufferedInputStream`. The parser waits until it reads the `\\r\\n` terminator. If the connection drops mid-command, the stream throws an `IOException` and the partial command is discarded."
          },
          {
            "id": 25,
            "question": "How do you handle a client disconnecting abruptly?",
            "answer": "The `InputStream.read()` method will return `-1` or throw an `IOException` (e.g., \"Connection reset by peer\"). The client handler catches this exception, gracefully closes the socket resources, and the thread is returned to the `ExecutorService`."
          },
          {
            "id": 26,
            "question": "If the server crashes, all in-memory data is lost. How would you design AOF (Append-Only File) or RDB snapshot persistence for this?",
            "answer": "For RDB (Snapshotting), I would spin up a background thread that periodically serializes the `ConcurrentHashMap` to disk. For AOF, every mutating command (SET/DEL) would be appended to a log file on disk before returning success to the client, allowing replay on startup."
          },
          {
            "id": 27,
            "question": "How did you measure the I/O performance of MiniRedis compared to actual Redis?",
            "answer": "I used the `redis-benchmark` CLI tool, pointing it to my MiniRedis port. While actual Redis easily handles 100k+ ops/sec due to its C-based epoll event loop, MiniRedis hit limitations much earlier due to Java thread overhead and blocking I/O, though it performed well for educational scopes."
          },
          {
            "id": 28,
            "question": "What are the memory layout differences between your Java objects and Redis's native C structures?",
            "answer": "Java objects have significant header overhead (e.g., 16 bytes per object header), meaning a simple string key-value pair takes up much more memory in Java than in Redis's highly optimized, contiguous C structs (like `sds` - simple dynamic strings)."
          },
          {
            "id": 29,
            "question": "How does Java Garbage Collection impact the latency (pause times) of your MiniRedis server?",
            "answer": "When the JVM performs a \"Stop-The-World\" minor or major GC, all application threads pause. For a real-time database, this causes unpredictable latency spikes. Real Redis (written in C) uses manual memory management (`malloc`/`free`) and doesn't suffer from GC pauses."
          },
          {
            "id": 30,
            "question": "Could a single slow client still exhaust a thread from your ExecutorService pool? How would you solve this using Java NIO?",
            "answer": "Yes, because `InputStream.read()` blocks. A client trickling 1 byte per second ties up an entire thread. Using Java NIO (Non-blocking I/O) with `Selector` and `SocketChannel`, a single thread can monitor thousands of connections and only allocate CPU time when data is actually ready to be read, solving the slow-client problem."
          }
        ]
      },
      {
        "title": "AI-Powered Customer Analytics Platform",
        "questions": [
          {
            "id": 31,
            "question": "What prompted you to use SQLite instead of PostgreSQL or MySQL for this analytics platform?",
            "answer": "SQLite is serverless, requires zero configuration, and stores the entire database in a single file. Since this was an interactive dashboard primarily focused on data analysis rather than high-concurrency transactional writes, SQLite provided the fastest setup and easiest portability without overhead."
          },
          {
            "id": 32,
            "question": "Can you explain the statistical A/B testing simulator you engineered? What metrics were you testing?",
            "answer": "I simulated user cohort data (Control vs. Treatment) evaluating metrics like conversion rate and retention time. I used Scipy to calculate the p-value via a T-test or Chi-Square test, determining if the changes in the treatment group were statistically significant or just random noise."
          },
          {
            "id": 33,
            "question": "What specific Scikit-learn classification model did you train (e.g., Random Forest, Logistic Regression) and why?",
            "answer": "I utilized a Random Forest Classifier. It handles non-linear relationships well, is robust to outliers, and inherently provides feature importance scores, which allowed the dashboard to explain exactly *why* a customer was flagged for churn."
          },
          {
            "id": 34,
            "question": "Churn datasets are notoriously imbalanced. How did you handle class imbalance?",
            "answer": "I used techniques like SMOTE (Synthetic Minority Over-sampling Technique) to generate synthetic samples of churning users, or applied class weights within the Scikit-learn model parameters (`class_weight='balanced'`) to penalize misclassifying the minority churn class heavier."
          },
          {
            "id": 35,
            "question": "What features were most mathematically indicative of a user churning?",
            "answer": "(Answer depends on your synthetic data, but usually): Metrics like \"days since last login\", \"frequency of app usage\", and \"drop in session length\" showed the highest Gini impurity reduction in the Random Forest feature importance analysis."
          },
          {
            "id": 36,
            "question": "How does the Streamlit dashboard interact with the machine learning model? Is inference done in real-time?",
            "answer": "The model was pre-trained and saved using `joblib` or `pickle`. When the Streamlit app loads, it loads the model into memory. When a user interacts with the dashboard, inference is done in real-time locally using the pre-loaded model."
          },
          {
            "id": 37,
            "question": "Can you explain how you integrated the Google Gemini Flash SDK into your data pipeline?",
            "answer": "I extracted the specific risk factors flagged by the model for a user (e.g., \"usage dropped by 40%\"). I passed these data points via the Gemini Python SDK API call to generate text, instructing the model to act as a customer success manager."
          },
          {
            "id": 38,
            "question": "How do you construct the prompts to ensure the generated retention emails are actually \"hyper-personalized\"?",
            "answer": "I used prompt templating. Instead of generic prompts, I injected dynamic variables: `\"Write a re-engagement email to {user_name} who has been a customer for {tenure} but whose usage of {favorite_feature} has dropped by {drop_percentage}. Offer them {incentive}.\"`"
          },
          {
            "id": 39,
            "question": "What are the latency and cost implications of calling the Gemini API for every flagged user?",
            "answer": "Calling an LLM API for thousands of users synchronously would be very slow and expensive. I mitigated this by batching API requests (if supported), caching similar prompts, or executing the API calls asynchronously in the background."
          },
          {
            "id": 40,
            "question": "How do you structurally evaluate if the AI-generated retention emails are effective?",
            "answer": "I would set up an A/B test pipeline. The control group receives a generic human-written template, and the treatment group receives the Gemini-generated personalized email. I then track the click-through rate (CTR) and 30-day reactivation metrics to determine statistical significance."
          }
        ]
      },
      {
        "title": "TheAlgorithms (Java Open Source Contribution)",
        "questions": [
          {
            "id": 41,
            "question": "Can you explain how a standard Merge Sort differs from your `ConcurrentMergeSort`?",
            "answer": "Standard Merge Sort recursively divides the array and merges it on a single thread. `ConcurrentMergeSort` delegates the recursive division and sorting of the left and right halves to separate threads in a thread pool, allowing modern multi-core processors to sort sub-arrays in parallel."
          },
          {
            "id": 42,
            "question": "How does the `ThreadPoolExecutor` slice the array workload? Did you use a fork-join approach?",
            "answer": "While `ForkJoinPool` is standard for recursive tasks in Java, I utilized a `ThreadPoolExecutor` and wrapped the recursive calls in `Future` tasks. The array indices `(left, right, mid)` are passed to the tasks, and the parent thread waits for both `Future.get()` calls to finish before merging."
          },
          {
            "id": 43,
            "question": "How do you prevent thread starvation when sorting massive arrays recursively?",
            "answer": "If every recursive split spawns a new thread, the thread pool queue gets flooded, and parent threads block waiting for children that cannot execute (deadlock/starvation). I solved this by capping the recursion depth for thread creation and using the sequential fallback."
          },
          {
            "id": 44,
            "question": "You mentioned a \"smart sequential fallback threshold\". How did you empirically determine this threshold size?",
            "answer": "I ran JMH (Java Microbenchmark Harness) tests on array sizes ranging from 10 to 1,000,000. I plotted the execution times and found that below a certain size (e.g., ~8192 elements), the `Arrays.sort()` sequential method was consistently faster than dispatching the task to a new thread."
          },
          {
            "id": 45,
            "question": "Why exactly does thread creation overhead dominate for small arrays?",
            "answer": "Creating a thread, scheduling it on a CPU core, and moving data into the CPU cache takes time. For a small array, the CPU can sequentially sort it in memory much faster than the OS can allocate and switch context to a new thread."
          },
          {
            "id": 46,
            "question": "What constitutes heavy context-switching overhead at the OS level?",
            "answer": "When the OS switches execution from Thread A to Thread B, it must save the CPU registers, program counter, and stack state of A, and load the state of B. It also causes CPU cache invalidation (cache misses), which is highly detrimental to performance."
          },
          {
            "id": 47,
            "question": "How did you write exhaustive JUnit 5 tests to prove thread-safety? What specific concurrency bugs were you testing for?",
            "answer": "I tested massive arrays with random data, reversed data, and all-identical data. I used `assertArrayEquals` against `Arrays.sort()` results. I was specifically testing for race conditions where multiple threads might attempt to overwrite the same array indices during the merge phase."
          },
          {
            "id": 48,
            "question": "What strict static analysis checks did your code have to pass before the maintainers merged it?",
            "answer": "TheAlgorithms repository heavily enforces tools like Checkstyle and SpotBugs. I had to ensure there were no resource leaks, variable shadowing, proper formatting, and that thread pools were safely shut down to prevent memory leaks in the CI/CD pipeline."
          },
          {
            "id": 49,
            "question": "Did you use `CountDownLatch`, `CyclicBarrier`, or `Future` objects to synchronize the sub-array merges?",
            "answer": "I used `Future` objects (e.g., `Future<?> leftFuture = executor.submit(...)`). Calling `leftFuture.get()` blocks the current thread until the sub-array is sorted. Once both left and right futures return, the parent thread safely proceeds to the `merge()` step."
          },
          {
            "id": 50,
            "question": "What was the exact performance improvement (e.g., speedup factor) of your implementation over the sequential version?",
            "answer": "On a multi-core machine sorting 10 million integers, the `ConcurrentMergeSort` achieved roughly an N-fold speedup (where N is the number of physical CPU cores), minus the overhead of the thread pool. For example, on a 4-core machine, it executed roughly 3x faster than the sequential version."
          }
        ]
      }
    ]
  },
  {
    "phase": "Phase 2: Core Fundamentals",
    "categories": [
      {
        "title": "Java & Spring Boot Fundamentals",
        "questions": [
          {
            "id": 1,
            "question": "How does Garbage Collection work in Java? Which GC algorithm is used by default in Java 21?",
            "answer": "GC automatically manages memory by identifying and deleting objects that are no longer reachable from GC Roots (e.g., active threads, static variables). Java 21 uses the G1 (Garbage-First) GC by default, which partitions the heap into regions and prioritizes collecting regions with the most garbage to meet user-defined pause-time goals."
          },
          {
            "id": 2,
            "question": "What is the structural difference between a `Runnable` and a `Callable` in Java?",
            "answer": "`Runnable` has a `run()` method that returns `void` and cannot throw checked exceptions. `Callable` has a `call()` method that returns a generic value (`V`) and is allowed to throw checked exceptions."
          },
          {
            "id": 3,
            "question": "Explain the internal working of a `HashMap`. How did it change in Java 8 regarding hash collisions?",
            "answer": "A `HashMap` stores key-value pairs in an array of nodes (buckets) using the hash code of the key to determine the index. In Java 8, if many keys hash to the same bucket (collision), the internal data structure for that bucket converts from a linked list to a balanced Red-Black tree once the threshold (usually 8) is reached, improving worst-case search time from O(N) to O(log N)."
          },
          {
            "id": 4,
            "question": "What is the difference between a `synchronized` block and a `ReentrantLock`?",
            "answer": "`synchronized` is a built-in Java keyword that automatically acquires and releases an intrinsic monitor lock. `ReentrantLock` is a class from `java.util.concurrent` that requires manual locking and unlocking but offers advanced features like fairness policies, interruptible locks, and `tryLock()` timeouts."
          },
          {
            "id": 5,
            "question": "How does the `volatile` keyword work in Java? When would you use it over synchronization?",
            "answer": "`volatile` ensures that a variable is always read from and written to main memory, bypassing the CPU cache, preventing thread visibility issues. You use it for simple flags (e.g., a `boolean isRunning`) where you only need visibility, but you must use synchronization if the operation requires atomicity (like `count++`)."
          },
          {
            "id": 6,
            "question": "Explain the Java Memory Model (JMM) and \"happens-before\" relationships.",
            "answer": "The JMM defines how threads interact through memory. The \"happens-before\" relationship guarantees that memory writes by one specific statement are visible to another specific statement. For example, unlocking a monitor \"happens-before\" every subsequent lock of that same monitor."
          },
          {
            "id": 7,
            "question": "What is inversion of control (IoC) and dependency injection (DI) in Spring Boot?",
            "answer": "IoC is a design principle where the control of object creation is transferred from the programmer to a container. DI is the implementation of IoC where the Spring framework automatically injects required dependencies (Beans) into a class at runtime (e.g., via `@Autowired` constructors)."
          },
          {
            "id": 8,
            "question": "How does Spring Boot auto-configuration work internally?",
            "answer": "Spring Boot uses the `@EnableAutoConfiguration` annotation to scan the classpath. Based on the presence of specific jars (like Tomcat or Jackson) and defined properties, it automatically creates and configures standard Beans using `@Conditional` annotations without requiring manual XML or Java configuration."
          },
          {
            "id": 9,
            "question": "What is the lifecycle of a Spring Bean?",
            "answer": "1. Instantiation. 2. Populating properties (Dependency Injection). 3. `BeanNameAware`, `BeanFactoryAware` callbacks. 4. Pre-initialization (`BeanPostProcessor`). 5. Initialization (e.g., `@PostConstruct`, `InitializingBean.afterPropertiesSet()`). 6. Post-initialization. 7. Ready for use. 8. Destruction (`@PreDestroy`, `DisposableBean`)."
          },
          {
            "id": 10,
            "question": "How does the `@Transactional` annotation work under the hood (AOP proxies)?",
            "answer": "Spring uses Aspect-Oriented Programming (AOP). When you call a `@Transactional` method, you aren't calling the actual class; you are calling a Spring-generated proxy. The proxy intercepts the call, opens a database connection, begins the transaction, calls your method, and then either commits upon success or rolls back upon an unchecked exception."
          },
          {
            "id": 11,
            "question": "What is the difference between `@RestController` and `@Controller`?",
            "answer": "`@Controller` is used for traditional Spring MVC applications that return HTML views (like JSP or Thymeleaf). `@RestController` is a convenience annotation that combines `@Controller` and `@ResponseBody`, meaning every method automatically serializes the returned object into JSON/XML for REST APIs."
          },
          {
            "id": 12,
            "question": "Explain the execution flow of a request passing through Spring MVC.",
            "answer": "1. HTTP request hits `DispatcherServlet`. 2. `DispatcherServlet` consults `HandlerMapping` to find the correct Controller. 3. Controller processes the request and returns data. 4. If REST, `HttpMessageConverter` formats it to JSON. 5. `DispatcherServlet` returns the HTTP response to the client."
          },
          {
            "id": 13,
            "question": "How would you handle a global exception in a Spring Boot application?",
            "answer": "I would create a class annotated with `@ControllerAdvice` or `@RestControllerAdvice`. Inside, I would write methods annotated with `@ExceptionHandler(CustomException.class)` to catch specific exceptions thrown anywhere in the application and return a standardized HTTP error response."
          },
          {
            "id": 14,
            "question": "What are the differences between OS threads and Virtual Threads (Project Loom)?",
            "answer": "OS threads (Platform Threads) are mapped 1:1 to heavy OS-level threads, making them expensive to create. Virtual threads are lightweight, JVM-managed threads mapped M:N to OS threads. They are incredibly cheap to create, allowing millions of concurrent blocked tasks without exhausting OS memory."
          },
          {
            "id": 15,
            "question": "Explain how `CompletableFuture` chains operations.",
            "answer": "`CompletableFuture` allows non-blocking task chaining. `thenApply()` transforms the result of the previous stage synchronously. `thenCompose()` is used to chain two asynchronous operations where the second depends on the first (like `flatMap`). `thenAccept()` consumes the result without returning anything."
          },
          {
            "id": 16,
            "question": "What is a Memory Leak in Java, and how can it happen if there's a Garbage Collector?",
            "answer": "A memory leak occurs when objects are no longer needed by the application but are still strongly referenced (e.g., unintentionally kept in a static `List` or `HashMap`). Because the GC roots still trace to them, the GC cannot reclaim the memory, eventually causing an `OutOfMemoryError`."
          },
          {
            "id": 17,
            "question": "How do you profile a Java application to find memory leaks or CPU bottlenecks?",
            "answer": "I would use tools like VisualVM, JProfiler, or Java Flight Recorder (JFR) to take heap dumps. Analyzing the heap dump allows me to see which objects are retaining memory. Thread dumps help identify deadlocks or CPU-heavy threads."
          },
          {
            "id": 18,
            "question": "What is the difference between `ExecutorService.submit()` and `execute()`?",
            "answer": "`execute()` takes a `Runnable` and returns `void`; exceptions thrown within it terminate the thread and print a stack trace. `submit()` takes a `Runnable` or `Callable` and returns a `Future`; exceptions are swallowed until you explicitly call `Future.get()`."
          },
          {
            "id": 19,
            "question": "How does `ThreadLocal` work, and what are its potential pitfalls in thread pools?",
            "answer": "`ThreadLocal` stores data that is accessible only by a specific thread. The pitfall in thread pools is that threads are reused. If you don't explicitly call `ThreadLocal.remove()` after the task is done, the data leaks into the next task that borrows that thread."
          },
          {
            "id": 20,
            "question": "Can you explain the difference between static and dynamic binding in Java?",
            "answer": "Static binding (early binding) occurs at compile time and is used for overloaded, private, static, or final methods. Dynamic binding (late binding) occurs at runtime and is used for overridden methods (polymorphism), where the JVM determines the actual object type to call the correct method."
          }
        ]
      },
      {
        "title": "Operating Systems & Networking",
        "questions": [
          {
            "id": 21,
            "question": "What happens at the OS level when a Java TCP socket calls `accept()`?",
            "answer": "The thread enters a blocking system call (`sys_accept`). The OS puts the thread to sleep. When the OS network stack completes a 3-way handshake with a new client, it places the connection in the socket's backlog queue, wakes up the Java thread, and returns a new file descriptor representing the new connection."
          },
          {
            "id": 22,
            "question": "Explain the TCP 3-way handshake in detail.",
            "answer": "1. Client sends a SYN (Synchronize) packet to the server. 2. Server receives it and replies with a SYN-ACK (Synchronize-Acknowledge) packet. 3. Client receives the SYN-ACK and replies with an ACK (Acknowledge) packet. A reliable connection is now established."
          },
          {
            "id": 23,
            "question": "What is the difference between TCP and UDP? Why is MiniRedis TCP only?",
            "answer": "TCP is connection-oriented, reliable, orders packets, and guarantees delivery. UDP is connectionless, fast, but packets can be lost or arrive out of order. MiniRedis requires TCP because database commands must be delivered reliably and in the exact sequence they were sent."
          },
          {
            "id": 24,
            "question": "What is a context switch? Why is it computationally expensive?",
            "answer": "A context switch is when the OS saves the state (registers, program counter) of a running thread/process and loads the state of a different one to share CPU time. It is expensive because it requires kernel-mode execution and flushes the CPU caches (TLB), slowing down memory access."
          },
          {
            "id": 25,
            "question": "Explain the difference between a Process and a Thread.",
            "answer": "A process is an independent program in execution with its own isolated memory space. A thread is the unit of execution within a process; multiple threads share the same process memory (heap) but have their own stack and registers."
          },
          {
            "id": 26,
            "question": "How do Mutexes differ from Semaphores?",
            "answer": "A Mutex (Mutual Exclusion) provides exclusive access to a shared resource (binary: locked or unlocked) and must be unlocked by the same thread that locked it. A Semaphore is a signaling mechanism with a counter that allows a specific number of threads to access a resource and can be signaled by any thread."
          },
          {
            "id": 27,
            "question": "What is a Deadlock? What are the 4 Coffman conditions for a deadlock to occur?",
            "answer": "A deadlock is when two or more threads are blocked forever, waiting for each other to release locks. The 4 conditions are: Mutual Exclusion, Hold and Wait, No Preemption (locks cannot be forcibly removed), and Circular Wait."
          },
          {
            "id": 28,
            "question": "How does virtual memory work? What is a page fault?",
            "answer": "Virtual memory abstracts physical RAM, giving processes the illusion of large, contiguous memory. The OS maps virtual addresses to physical addresses using page tables. A page fault occurs when a process accesses a memory page not currently loaded in physical RAM, forcing the OS to fetch it from the disk (swap space)."
          },
          {
            "id": 29,
            "question": "What is the difference between Blocking I/O and Non-Blocking I/O (NIO)?",
            "answer": "Blocking I/O forces the thread to halt execution until data is fully read/written. Non-blocking I/O allows the thread to initiate an I/O request and immediately return. Using an event loop (`Selector`), the thread is only notified when data is actually ready, allowing one thread to handle thousands of connections."
          },
          {
            "id": 30,
            "question": "Explain what an inode is in Linux.",
            "answer": "An inode (index node) is a data structure on a Unix-style file system that stores metadata about a file, such as its size, permissions, ownership, and physical disk block locations, but not the file's name or its actual data."
          },
          {
            "id": 31,
            "question": "What is a file descriptor? How does a socket relate to a file descriptor?",
            "answer": "A file descriptor is a non-negative integer used by the OS kernel to identify an open file, stream, or network connection for a process. In Linux, \"everything is a file\", so when you open a TCP socket, the OS allocates a file descriptor for it to handle read/write operations."
          },
          {
            "id": 32,
            "question": "Describe the OSI model layers and exactly where TCP fits in.",
            "answer": "The OSI layers are Application, Presentation, Session, Transport, Network, Data Link, and Physical. TCP is a Transport Layer (Layer 4) protocol responsible for end-to-end communication and reliability."
          },
          {
            "id": 33,
            "question": "What is backpressure in network communications?",
            "answer": "Backpressure is a mechanism where a receiving system signals to a sending system that it is overwhelmed and cannot process data fast enough. In TCP, this is handled naturally via the \"receive window\" size, forcing the sender to slow down."
          },
          {
            "id": 34,
            "question": "How does the OS schedule threads? What is time-slicing?",
            "answer": "The OS uses a scheduler (like Linux's CFS - Completely Fair Scheduler) to decide which thread runs on the CPU. Time-slicing assigns a small, specific time quantum (e.g., 10ms) to a thread; when time is up, the OS preempts it and context-switches to the next thread."
          },
          {
            "id": 35,
            "question": "How can you find which process is listening on a specific port in Linux using CLI tools?",
            "answer": "You can use the `netstat -tulpn | grep <port>` command, or the modern equivalent `ss -tulpn | grep <port>`, or `lsof -i :<port>`."
          }
        ]
      },
      {
        "title": "Docker & Systems",
        "questions": [
          {
            "id": 36,
            "question": "How do Docker containers isolate resources using Linux Namespaces and Cgroups?",
            "answer": "Namespaces provide process-level isolation (e.g., isolating process IDs, network interfaces, mount points) so the container thinks it's a standalone system. Cgroups (Control Groups) provide resource limiting, restricting how much CPU and Memory the container's processes can use."
          },
          {
            "id": 37,
            "question": "What is the difference between a Docker image and a Docker container?",
            "answer": "A Docker image is a read-only, immutable template containing the application code, libraries, and runtime environment. A Docker container is a runnable, ephemeral instance of that image with a read-write layer on top."
          },
          {
            "id": 38,
            "question": "How does Docker's layered file system (UnionFS) work?",
            "answer": "Images are built in layers (each instruction in a Dockerfile creates a layer). UnionFS transparently overlays these read-only layers into a single cohesive file system. When a container starts, a thin read-write layer is added on top; any modifications happen only in this top layer (Copy-on-Write)."
          },
          {
            "id": 39,
            "question": "What happens inside the container when it hits the memory limit (OOM Killer)?",
            "answer": "The OS kernel's OOM (Out Of Memory) Killer intervenes. It terminates the process inside the container that is consuming the most memory to protect the host system. The container stops and typically exits with code 137."
          },
          {
            "id": 40,
            "question": "What specific flags or network modes did you use to strip network access from the sandbox containers?",
            "answer": "I used `--network none`. This attaches the container only to the loopback interface (`lo`), completely disconnecting it from the host's bridge network and preventing any inbound or outbound internet access."
          },
          {
            "id": 41,
            "question": "Why might a Docker container exit immediately after starting?",
            "answer": "A container exits when its primary foreground process (PID 1) finishes execution. If you run an image without a long-running foreground task (like a web server or a `tail -f`), or if the initialization script throws an error, it will immediately exit."
          },
          {
            "id": 42,
            "question": "How does the `docker-java` API communicate with the Docker daemon?",
            "answer": "The `docker-java` SDK communicates with the Docker daemon using the Docker Engine REST API, typically connecting over a Unix socket (`/var/run/docker.sock`) on Linux or via TCP on Windows/macOS."
          },
          {
            "id": 43,
            "question": "What are the security risks of mounting volumes in Docker containers running untrusted code?",
            "answer": "If you mount a host directory into a container running untrusted code, malicious code could modify, delete, or read sensitive host files. If you mount the Docker socket itself (`docker.sock`), the container can gain full root control over the host machine (Docker escape)."
          },
          {
            "id": 44,
            "question": "What is a reverse proxy? Have you considered putting Nginx in front of your Code Engine API?",
            "answer": "A reverse proxy sits in front of backend servers, forwarding client requests to them. Adding Nginx to Code Engine would allow it to handle SSL termination, load balancing across multiple Code Engine API instances, and caching, taking load off the Spring Boot application."
          },
          {
            "id": 45,
            "question": "Explain the concept of horizontal vs. vertical scaling. Which one is Code Engine optimized for?",
            "answer": "Vertical scaling (scaling up) means adding more CPU/RAM to a single machine. Horizontal scaling (scaling out) means adding more machines. Code Engine is heavily optimized for horizontal scaling because its architecture is stateless; you can easily spin up multiple servers running Docker to handle more executions."
          },
          {
            "id": 46,
            "question": "What is an API Gateway and when would you use one?",
            "answer": "An API Gateway acts as a single entry point for a microservices architecture. It handles cross-cutting concerns like authentication, rate limiting, logging, and routing requests to the appropriate backend microservices."
          },
          {
            "id": 47,
            "question": "How do you handle container lifecycle management (stopping zombie containers) in CodeEngine?",
            "answer": "I implemented a `try-finally` block ensuring `docker rm -f` is always called when execution finishes. Additionally, a scheduled background cron job routinely queries the Docker API to force-remove any containers that have been running longer than the maximum timeout threshold."
          },
          {
            "id": 48,
            "question": "What is the structural difference between a Virtual Machine and a Docker Container?",
            "answer": "A VM virtualizes the physical hardware and requires a full, heavy Guest OS (GBs in size, slow to boot). A Docker container virtualizes the Operating System, sharing the host's kernel, making it extremely lightweight (MBs in size, boots in milliseconds)."
          },
          {
            "id": 49,
            "question": "How does DNS resolution work when your backend tries to call external APIs?",
            "answer": "The application asks the OS to resolve the domain name (e.g., `api.gemini.com`). The OS checks its local cache and `/etc/hosts`. If not found, it queries a recursive DNS resolver (like an ISP or Google's 8.8.8.8), which traverses Root, TLD, and Authoritative Name Servers to return the IP address."
          },
          {
            "id": 50,
            "question": "What is a container registry?",
            "answer": "A container registry (like Docker Hub or AWS ECR) is a centralized repository used to store, manage, and distribute Docker images so they can be easily pulled and deployed across different environments."
          }
        ]
      }
    ]
  },
  {
    "phase": "Phase 3: System Design & Behavioral",
    "categories": [
      {
        "title": "System Design & Architecture",
        "questions": [
          {
            "id": 1,
            "question": "Design LeetCode: How would you scale your current Code Engine to support 1 million daily active users?",
            "answer": "I would implement horizontal scaling by placing an API Gateway (like Nginx or AWS API Gateway) in front of multiple Spring Boot Code Engine instances. I would introduce a distributed message queue (like RabbitMQ or Kafka) so that user submissions are queued instead of kept in memory. Worker nodes pull from the queue, execute code in Docker, and push results back to a Redis cache or a highly available database (like PostgreSQL)."
          },
          {
            "id": 2,
            "question": "Design Redis: How would you implement sharding and replication for your MiniRedis project?",
            "answer": "For sharding, I would use consistent hashing to distribute keys across multiple MiniRedis instances, preventing a single node from running out of memory. For replication, I would implement a master-slave architecture where the master handles writes and asynchronously ships a replication log (AOF) to read-only slaves to scale read throughput and provide fault tolerance."
          },
          {
            "id": 3,
            "question": "Design a Rate Limiter: What algorithms could you use for your Code Engine API?",
            "answer": "I would use the Token Bucket algorithm, backed by a fast distributed cache like Redis. Each user (by API key or IP) gets a bucket with a maximum capacity (e.g., 5 tokens) that refills at a fixed rate (e.g., 1 token/sec). If a request arrives and the bucket is empty, the API returns a 429 Too Many Requests."
          },
          {
            "id": 4,
            "question": "How would you design a load balancer for your Distributed Code Engine?",
            "answer": "I would use a Layer 7 (Application) load balancer. Since Code Engine execution times vary greatly, I would use a \"Least Connections\" or \"Least Response Time\" routing algorithm rather than Round-Robin, ensuring that long-running code executions don't pile up on a single server while others sit idle."
          },
          {
            "id": 5,
            "question": "How would you ensure high availability (HA) for your MiniRedis implementation?",
            "answer": "I would deploy multiple replica instances across different Availability Zones (AZs). I would implement a Gossip protocol or use a consensus algorithm like Raft or ZooKeeper to monitor node health. If the master fails, the cluster would automatically elect a new master from the replicas, minimizing downtime."
          },
          {
            "id": 6,
            "question": "Explain the CAP theorem. Which properties does your MiniRedis favor?",
            "answer": "CAP theorem states a distributed data store can only provide two of three guarantees: Consistency, Availability, and Partition Tolerance. In the event of a network partition, a system must choose between Consistency (returning errors to avoid stale data) or Availability (returning potentially stale data). An in-memory cache like MiniRedis generally favors AP (Availability and Partition tolerance) over strict consistency."
          },
          {
            "id": 7,
            "question": "Design an analytics tracking system to ingest massive amounts of clickstream data.",
            "answer": "I would build an ingestion pipeline using an API Gateway pushing directly to Apache Kafka to buffer massive data spikes. Stream processing tools like Apache Flink or Spark Streaming would aggregate the data in real-time. The processed data would be stored in a columnar database like ClickHouse or Amazon Redshift, which Streamlit or Tableau would query for the dashboard."
          },
          {
            "id": 8,
            "question": "How would you implement a Pub/Sub system using your MiniRedis?",
            "answer": "I would add a `SUBSCRIBE` command that maps a channel name to a list of connected client sockets in a `ConcurrentHashMap`. When a `PUBLISH` command is received for a channel, the server iterates through that list and pushes the message to all subscribed sockets' output streams asynchronously."
          },
          {
            "id": 9,
            "question": "Design a distributed message queue (like Kafka or RabbitMQ).",
            "answer": "The core components are Producers, Brokers, and Consumers. Messages are appended to an immutable append-only log on the disk of the Broker for durability. Topics are partitioned across multiple Brokers for horizontal scalability. Consumers pull messages using an offset to track their position in the log."
          },
          {
            "id": 10,
            "question": "How do you handle caching strategies?",
            "answer": "- **Cache-Aside (Lazy Loading):** App asks cache; if miss, asks DB, puts in cache. Good for read-heavy.\n- **Write-Through:** App writes to cache, cache synchronously writes to DB. Safe but slow writes.\n- **Write-Behind (Write-Back):** App writes to cache, cache asynchronously writes to DB. Fast writes, but risks data loss if cache crashes."
          },
          {
            "id": 11,
            "question": "What is eventual consistency vs. strong consistency?",
            "answer": "Strong consistency guarantees that after a write, any subsequent read will return the updated value immediately. Eventual consistency guarantees that if no new updates are made, all replicas will eventually converge to the same value, prioritizing low latency and high availability over immediate correctness."
          },
          {
            "id": 12,
            "question": "How would you implement distributed tracing in a microservices architecture?",
            "answer": "I would use tools like Jaeger or Zipkin. The API Gateway generates a unique `Trace ID` for every incoming request and injects it into the HTTP headers. Every subsequent microservice logs this `Trace ID` and a `Span ID` (for specific operations) and forwards it to downstream services, allowing the entire flow to be visualized."
          },
          {
            "id": 13,
            "question": "If your Code Engine's API node goes down, how do you recover the queued execution jobs?",
            "answer": "If jobs are only in the `ThreadPoolTaskExecutor` (in-memory queue), they are lost on crash. To fix this, I would decouple the queue from memory by using a persistent message broker (RabbitMQ/Kafka) with message acknowledgments (ACKs). If a node dies before sending an ACK, the broker requeues the job to a different node."
          },
          {
            "id": 14,
            "question": "How would you design a dashboard that requires sub-second latency for millions of records?",
            "answer": "I would rely on a combination of pre-aggregation and caching. Instead of running raw SQL `GROUP BY` queries on millions of rows in real-time, I would use background jobs to pre-calculate aggregates (e.g., hourly/daily rollups) and store them in a fast cache like Redis or a materialized view, which the dashboard queries instantly."
          },
          {
            "id": 15,
            "question": "Explain how consistent hashing works and why it's useful in distributed systems.",
            "answer": "Consistent hashing maps both data keys and server nodes to a virtual circular hash ring. A key is assigned to the first node found moving clockwise. When a node is added or removed, only the keys belonging to its immediate neighbor are remapped, minimizing massive data shuffling compared to traditional `hash(key) % N` algorithms."
          }
        ]
      },
      {
        "title": "Data Structures & Algorithms",
        "questions": [
          {
            "id": 16,
            "question": "How does a ConcurrentHashMap work internally compared to a normal HashMap?",
            "answer": "A normal HashMap locks the entire data structure for writes, leading to bottlenecks. A ConcurrentHashMap divides the map into segments (or buckets). It uses CAS operations for reads/updates and only locks the specific bucket being modified, allowing multiple threads to write to different buckets simultaneously."
          },
          {
            "id": 17,
            "question": "Explain the time and space complexity of your `ConcurrentMergeSort`.",
            "answer": "- **Time Complexity:** O(N log N) overall. However, the wall-clock time is reduced to O((N log N) / P) where P is the number of CPU cores.\n- **Space Complexity:** O(N) for the temporary arrays required during the merge phase, plus O(log N) stack space for recursion."
          },
          {
            "id": 18,
            "question": "Given a continuous stream of numbers, how would you find the median dynamically?",
            "answer": "I would use two Heaps: a Max-Heap to store the smaller half of the numbers, and a Min-Heap to store the larger half. I keep the sizes of the heaps balanced (difference of at most 1). The median is either the top of the larger heap, or the average of the tops of both heaps."
          },
          {
            "id": 19,
            "question": "How would you implement an LRU Cache from scratch?",
            "answer": "I would use a combination of a HashMap and a Doubly-Linked List. The HashMap provides O(1) access to nodes. The Doubly-Linked List maintains the recency of use. When a node is accessed, it is moved to the head (Most Recently Used). When capacity is full, the tail node (Least Recently Used) is removed from both the list and the map."
          },
          {
            "id": 20,
            "question": "Explain how a Trie data structure works and where it is used.",
            "answer": "A Trie (Prefix Tree) is a tree where each node represents a character of a string. Paths from the root down represent prefixes. It provides O(L) time complexity for insertions and lookups (L = length of string). It is primarily used for autocomplete, spell checkers, and IP routing."
          },
          {
            "id": 21,
            "question": "What is the difference between BFS and DFS?",
            "answer": "- **BFS (Breadth-First Search):** Explores level by level using a Queue. Best for finding the shortest path in unweighted graphs (e.g., minimum steps to reach a target).\n- **DFS (Depth-First Search):** Explores as deep as possible before backtracking using a Stack (or recursion). Best for detecting cycles, topological sorting, or exploring all possible paths."
          },
          {
            "id": 22,
            "question": "How do you detect a cycle in a directed graph?",
            "answer": "I would use DFS with three states for each node: Unvisited, Visiting, and Visited. During DFS, if we encounter a node that is currently in the \"Visiting\" state, a cycle exists (we hit a back-edge)."
          },
          {
            "id": 23,
            "question": "Explain dynamic programming using the Knapsack problem as an example.",
            "answer": "DP optimizes recursive problems with overlapping subproblems by saving results. In the 0/1 Knapsack problem, instead of recalculating the optimal value for every subset of items, we build a 2D array `dp[item][capacity]` where each cell builds upon the optimal choice (include vs exclude) of the previous items."
          },
          {
            "id": 24,
            "question": "How do you find the longest palindromic substring in a string?",
            "answer": "I would use the \"Expand Around Center\" approach. For each character (and between each pair of characters), I treat it as the center of a palindrome and expand outwards to the left and right as long as the characters match, keeping track of the maximum length found in O(N^2) time and O(1) space."
          },
          {
            "id": 25,
            "question": "What is a segment tree and when would you use it?",
            "answer": "A Segment Tree is a tree data structure used for storing intervals or segments. It allows querying an array range (like finding the sum or minimum in an interval) and updating array elements both in O(log N) time. I use it for range query problems in competitive programming."
          },
          {
            "id": 26,
            "question": "How does Dijkstra's algorithm work? What are its limitations?",
            "answer": "Dijkstra's uses a priority queue (Min-Heap) to greedily pick the node with the smallest known distance from the start, relaxing all its adjacent edges to find the shortest path in a weighted graph. Its limitation is that it fails if the graph contains negative weight edges (Bellman-Ford is needed instead)."
          },
          {
            "id": 27,
            "question": "Explain the logic behind a Disjoint Set (Union-Find) data structure.",
            "answer": "It tracks a set of elements partitioned into a number of disjoint (non-overlapping) subsets. It supports two operations: `Find` (determines which subset an element is in) and `Union` (joins two subsets). By using Path Compression and Union by Rank, these operations run in nearly O(1) time. It is highly used in Kruskal's MST algorithm."
          },
          {
            "id": 28,
            "question": "How would you sort an array of 1 billion integers that don't fit into memory?",
            "answer": "I would use External Merge Sort. I divide the massive file into manageable chunks that fit in RAM. I sort each chunk in memory (e.g., using QuickSort) and write them back to temporary files on disk. Finally, I use a Min-Heap to perform an K-way merge of the temporary files, streaming the sorted output back to disk."
          },
          {
            "id": 29,
            "question": "What is a topological sort?",
            "answer": "Topological sort is a linear ordering of vertices in a Directed Acyclic Graph (DAG) such that for every directed edge `U -> V`, vertex `U` comes before `V` in the ordering. It is commonly used for scheduling jobs with dependencies (like compiling code files or resolving package dependencies)."
          },
          {
            "id": 30,
            "question": "How do you implement a thread-safe Queue from scratch using only Locks and Condition variables?",
            "answer": "I would use an array or linked list, a `ReentrantLock`, and two Condition variables (`notEmpty` and `notFull`). The `enqueue` method locks, waits on `notFull` if capacity is reached, adds the item, signals `notEmpty`, and unlocks. The `dequeue` method locks, waits on `notEmpty` if empty, removes the item, signals `notFull`, and unlocks."
          }
        ]
      },
      {
        "title": "Testing & Machine Learning",
        "questions": [
          {
            "id": 31,
            "question": "What is the difference between Unit, Integration, and E2E Testing?",
            "answer": "- **Unit Testing:** Tests an isolated component or method independently (mocking dependencies).\n- **Integration Testing:** Tests how different components (e.g., backend and database) work together.\n- **E2E (End-to-End) Testing:** Tests the entire application flow from the user's perspective (e.g., browser to backend to DB and back)."
          },
          {
            "id": 32,
            "question": "How did you mock external dependencies in your JUnit 5 tests?",
            "answer": "I used a framework like Mockito (`@Mock`, `@InjectMocks`). For the Code Engine, I mocked the `docker-java` client so my unit tests wouldn't actually spin up Docker containers. I mocked the responses of the Docker API to return simulated success or timeout results to test my backend logic isolatedly."
          },
          {
            "id": 33,
            "question": "What is test-driven development (TDD)? Did you use it for MiniRedis?",
            "answer": "TDD is a methodology where you write the test *before* the actual code. The cycle is: Write a failing test (Red), write minimum code to pass it (Green), then Refactor. I used aspects of it for MiniRedis by first writing tests that asserted correct RESP protocol parsing before implementing the parser logic."
          },
          {
            "id": 34,
            "question": "How did you measure test coverage for your Code Engine?",
            "answer": "I used JaCoCo (Java Code Coverage) integrated into my Maven/Gradle build. It analyzes which lines and branches of code are executed during unit tests and generates an HTML report, helping me ensure critical paths like the `CallerRunsPolicy` handler were tested."
          },
          {
            "id": 35,
            "question": "What is an A/B test? How do you calculate statistical significance (p-value)?",
            "answer": "An A/B test compares a Control group to a Treatment group to measure the impact of a change. The p-value indicates the probability that the observed differences happened by random chance. A p-value less than 0.05 generally indicates statistical significance, meaning the treatment caused the change."
          },
          {
            "id": 36,
            "question": "In Scikit-learn, what is the difference between `fit()`, `transform()`, and `predict()`?",
            "answer": "- `fit()` calculates the parameters of the model or scaler based on training data.\n- `transform()` applies those calculated parameters to modify the data (e.g., normalizing it).\n- `predict()` uses a trained machine learning model to output the classification or regression result for new data."
          },
          {
            "id": 37,
            "question": "What is cross-validation and why is it important in ML?",
            "answer": "Cross-validation (like K-Fold) splits the dataset into multiple subsets. The model trains on some subsets and tests on the remainder, rotating until all data has been used for testing. It prevents overfitting and ensures the model generalizes well to unseen data rather than just memorizing the training set."
          },
          {
            "id": 38,
            "question": "Explain precision, recall, and F1-score. Which was most important for predicting customer churn?",
            "answer": "- **Precision:** Out of all predicted churns, how many actually churned? (Limits false positives).\n- **Recall:** Out of all actual churns, how many did we find? (Limits false negatives).\n- **F1-Score:** The harmonic mean of both.\nFor churn, **Recall** is usually more important; it's better to accidentally send a retention email to a safe user (False Positive) than to miss a user who is about to leave (False Negative)."
          },
          {
            "id": 39,
            "question": "What is overfitting, and how do you prevent it in classification models?",
            "answer": "Overfitting is when a model learns the training data's noise and details too perfectly, failing to generalize to new data. Prevent it by using simpler models, adding regularization (L1/L2 penalties), using cross-validation, applying dropout (in neural networks), or pruning (in Random Forests)."
          },
          {
            "id": 40,
            "question": "How do you handle missing data in Pandas before training a model?",
            "answer": "Depending on the missing data's volume and importance, I would either drop the rows (`dropna()`) if they are negligible, impute them with statistical measures like mean/median (`fillna()`), or use advanced imputation techniques like K-Nearest Neighbors (KNNImputer) to predict the missing values based on similar rows."
          }
        ]
      },
      {
        "title": "Behavioral & Professional (STAR Method Outlines)",
        "questions": [
          {
            "id": 41,
            "question": "Severe bug in Code Engine debugging:",
            "answer": "- **Situation:** Deployed Code Engine, noticed it crashing intermittently under load.\n- **Task:** Find the root cause of the crashes without bringing the system down permanently.\n- **Action:** I analyzed thread dumps and Docker logs, realizing that containers weren't being cleaned up after timeouts, causing disk space exhaustion. I implemented a robust `try-finally` block for cleanup and a scheduled cron job to prune dangling containers.\n- **Result:** Stability increased, hitting the 130 req/sec benchmark consistently."
          },
          {
            "id": 42,
            "question": "Why build MiniRedis from scratch instead of learning Redis codebase?",
            "answer": "- **Situation:** I wanted to deepen my understanding of networking and concurrency.\n- **Task/Action:** While reading the C codebase of Redis would teach me its implementation, building MiniRedis from scratch in Java forced me to grapple with raw TCP sockets, the nuances of `ConcurrentHashMap`, and thread pool exhaustion directly.\n- **Result:** I gained an intimate, practical understanding of blocking vs. non-blocking I/O and concurrent data structures that reading code alone couldn't provide."
          },
          {
            "id": 43,
            "question": "Disagreeing with an open-source maintainer's feedback:",
            "answer": "- **Situation:** During my PR for `ConcurrentMergeSort`, a maintainer suggested changing my synchronization logic.\n- **Task:** Evaluate their feedback without ego.\n- **Action:** I researched their suggestion, benchmarked both approaches using JMH, and found my original approach was slightly faster but theirs was safer for varying thread pool configurations. I presented the benchmark data to them and agreed to implement their safer suggestion.\n- **Result:** The PR was merged smoothly, and I learned a new perspective on thread safety versus raw speed."
          },
          {
            "id": 44,
            "question": "Time management (Coursework, CP, Projects):",
            "answer": "- **Action:** I treat my schedule like a sprint. I prioritize tasks using a matrix, allocating weekends for deep-work on backend projects, weekday evenings for competitive programming contests, and daytime for VIT coursework. I heavily utilize automation and strict time-boxing to avoid burnout."
          },
          {
            "id": 45,
            "question": "Most challenging technical decision in Distributed Code Engine:",
            "answer": "- **Action:** Choosing the concurrency handling method. I initially tried an unbounded queue, which led to OutOfMemory errors. I then had to research and implement the `ThreadPoolTaskExecutor` with a `CallerRunsPolicy` to create natural backpressure, which required fundamentally redesigning the API to be fully asynchronous."
          },
          {
            "id": 46,
            "question": "Major architectural change for MiniRedis today:",
            "answer": "- **Action:** I would completely rewrite the networking layer. Blocking I/O (using `java.net.Socket`) severely limits scalability because every connection consumes a thread. I would migrate to Java NIO (Non-blocking I/O) using `Selector` and `SocketChannel` so a single thread can handle thousands of idle connections efficiently via an event loop."
          },
          {
            "id": 47,
            "question": "Unexpected A/B test results:",
            "answer": "- **Action:** In my analytics platform simulator, if an A/B test showed that a highly personalized retention email actually *increased* churn. Instead of discarding the data, I segmented the cohorts. I discovered it worked well for new users but annoyed veteran users.\n- **Result:** I pivoted the strategy to only apply the model to specific tenure cohorts, leading to a better overall retention metric."
          },
          {
            "id": 48,
            "question": "Technical focus shift in the next 2 years:",
            "answer": "- **Action:** Given my foundation in competitive programming and Java backend, I plan to pivot deeper into Distributed Systems architecture. I want to move beyond single-node Spring Boot apps and deeply understand distributed consensus, Kubernetes orchestration, and building data-intensive microservices at cloud scale."
          },
          {
            "id": 49,
            "question": "Staying updated with Java:",
            "answer": "- **Action:** I actively follow JEPs (JDK Enhancement Proposals). For instance, I'm currently experimenting with Project Loom (Virtual Threads) introduced in Java 21, as it completely changes the paradigm of thread pooling that I used in my Code Engine and MiniRedis projects."
          },
          {
            "id": 50,
            "question": "Why you're the ideal candidate:",
            "answer": "- **Action:** Most students either focus purely on competitive programming or purely on building web apps. I bridge that gap. My 1289 Codeforces rating proves my algorithmic rigor, while my Code Engine and MiniRedis projects prove I can apply those algorithms to build scalable, concurrent, system-level software. I don't just use frameworks; I understand how they work under the hood."
          }
        ]
      }
    ]
  },
  {
    "phase": "Phase 4: Missing Links",
    "categories": [
      {
        "title": "React.js & JavaScript Fundamentals",
        "questions": [
          {
            "id": 1,
            "question": "Explain how the Virtual DOM works in React. Why is it faster than manipulating the real DOM?",
            "answer": "The Virtual DOM is a lightweight JavaScript representation of the actual DOM. When state changes, React creates a new Virtual DOM and compares it with the previous one (Diffing algorithm). It then calculates the minimum number of changes required and updates the real DOM in a single batch (Reconciliation). This minimizes expensive layout reflows and repaints in the browser."
          },
          {
            "id": 2,
            "question": "What is the difference between `let`, `const`, and `var` in JavaScript?",
            "answer": "`var` is function-scoped and hoisted (can be accessed before initialization, resulting in `undefined`). `let` and `const` are block-scoped and hoisted but stay in the \"Temporal Dead Zone\" (cannot be accessed before initialization). `const` prevents reassignment of the variable, though the contents of objects/arrays defined with `const` can still be mutated."
          },
          {
            "id": 3,
            "question": "Explain Closures in JavaScript. Where might you use them in React?",
            "answer": "A closure is a function that remembers its outer variables and can access them even after the outer function has finished executing. In React, closures are heavily used in functional components and hooks (e.g., event handlers or `useEffect` callbacks that capture the component's state variables at the time of their creation)."
          },
          {
            "id": 4,
            "question": "What is the JavaScript Event Loop, and how does it handle asynchronous operations?",
            "answer": "JavaScript is single-threaded. When an async operation (like `fetch` or `setTimeout`) occurs, it is handed off to the Web APIs. Once finished, the callback is pushed to the Task Queue (or Microtask Queue for Promises). The Event Loop constantly checks if the Call Stack is empty; if it is, it pushes the first callback from the queue onto the stack for execution."
          },
          {
            "id": 5,
            "question": "Why did you use React for the Code Engine frontend instead of vanilla HTML/JS?",
            "answer": "React provides a component-based architecture, which makes building complex UIs (like integrating the Monaco Editor, handling state for code execution, and managing terminal output) modular and reusable. Its state management natively handles the dynamic rendering required for a code execution platform without manually querying DOM nodes."
          },
          {
            "id": 6,
            "question": "Explain the `useEffect` hook. What does the dependency array do?",
            "answer": "`useEffect` lets you perform side effects (data fetching, DOM manipulation, subscriptions) in functional components. The dependency array tells React when to re-run the effect. If empty `[]`, it runs only on mount. If it contains variables `[state]`, it runs when those variables change. If omitted, it runs after every render."
          },
          {
            "id": 7,
            "question": "What is \"Prop Drilling\" and how can you avoid it?",
            "answer": "Prop drilling is passing data from a parent component down to deeply nested child components through intermediary components that don't actually need the data. You can avoid it by using the React Context API or state management libraries like Redux/Zustand."
          },
          {
            "id": 8,
            "question": "How did you integrate the Monaco Editor in your Code Engine frontend?",
            "answer": "I used a wrapper package (like `@monaco-editor/react`). I managed the editor's state by passing the current code string and language (Java/C++/Python) as props, and attached an `onChange` handler to update the React state whenever the user typed, which was then sent in the JSON payload on submission."
          },
          {
            "id": 9,
            "question": "What are Promises in JavaScript? What is the difference between Promise.all() and Promise.race()?",
            "answer": "A Promise represents the eventual completion (or failure) of an asynchronous operation. `Promise.all()` takes an array of promises and resolves only when *all* of them resolve, failing if any one fails. `Promise.race()` resolves or rejects as soon as the *first* promise in the array settles."
          },
          {
            "id": 10,
            "question": "How do you optimize a React application that is rendering too slowly?",
            "answer": "I would use React Profiler to identify slow components. I would prevent unnecessary re-renders using `React.memo()` for functional components, `useMemo()` for expensive calculations, and `useCallback()` to memoize functions passed as props. I'd also implement code-splitting and lazy loading for routes."
          }
        ]
      },
      {
        "title": "Relational Databases & SQL (DBMS)",
        "questions": [
          {
            "id": 11,
            "question": "What are the ACID properties in a database?",
            "answer": "- **Atomicity:** A transaction is all-or-nothing (e.g., transferring money).\n- **Consistency:** Data must be valid according to defined rules (constraints, cascades) before and after the transaction.\n- **Isolation:** Concurrent transactions don't interfere with each other (handled by isolation levels).\n- **Durability:** Once committed, data is permanently saved, even in a power failure."
          },
          {
            "id": 12,
            "question": "Explain the difference between an INNER JOIN, LEFT JOIN, and FULL OUTER JOIN.",
            "answer": "- `INNER JOIN`: Returns rows where there is a match in both tables.\n- `LEFT JOIN`: Returns all rows from the left table, and the matched rows from the right table (NULL if no match).\n- `FULL OUTER JOIN`: Returns all rows when there is a match in either the left or right table."
          },
          {
            "id": 13,
            "question": "What is database normalization? Explain 1NF, 2NF, and 3NF.",
            "answer": "Normalization reduces data redundancy. \n- **1NF:** Each column contains atomic (indivisible) values, and each record is unique.\n- **2NF:** It is in 1NF, and all non-key attributes are fully functionally dependent on the entire primary key (no partial dependency).\n- **3NF:** It is in 2NF, and there are no transitive dependencies (non-key attributes depend only on the primary key)."
          },
          {
            "id": 14,
            "question": "What is a Database Index, and how does it speed up queries?",
            "answer": "An index is a data structure (usually a B-Tree or Hash Table) that stores a copy of a specific column's data pointing to the physical row location. It speeds up `SELECT` queries (changing O(N) scans to O(log N) lookups) but slows down `INSERT`/`UPDATE`/`DELETE` because the index must be updated."
          },
          {
            "id": 15,
            "question": "Explain the difference between a Clustered and Non-Clustered Index.",
            "answer": "A Clustered Index determines the actual physical order of the data rows on the disk (a table can only have one). A Non-Clustered Index is a separate structure from the data rows that contains pointers to the actual data (a table can have multiple)."
          },
          {
            "id": 16,
            "question": "What is a SQL Injection attack and how do you prevent it?",
            "answer": "SQL injection occurs when a user inputs malicious SQL commands into a query (e.g., `' OR 1=1; DROP TABLE users;--`). It is prevented by using Prepared Statements (Parameterized Queries) where the database driver strictly separates the SQL logic from the user-provided data parameters."
          },
          {
            "id": 17,
            "question": "What is the N+1 query problem, particularly in ORMs like Hibernate/Spring Data?",
            "answer": "It occurs when an ORM fetches a list of N entities (1 query) and then fetches the related children for each entity individually (N queries), resulting in N+1 total queries. It is solved by using `JOIN FETCH` in JPQL or Entity Graphs to load all data in a single query."
          },
          {
            "id": 18,
            "question": "Describe a scenario where you would use a NoSQL database over a Relational SQL database.",
            "answer": "I would use NoSQL (like MongoDB or Cassandra) when the data schema is highly unstructured/variable, when handling massive volumes of fast-ingesting unstructured data (like logs or IoT sensors), or when I need to easily horizontally scale writes across multiple servers without complex sharding logic."
          }
        ]
      },
      {
        "title": "REST APIs & Web Architecture",
        "questions": [
          {
            "id": 19,
            "question": "What does it mean for a REST API to be \"Stateless\"?",
            "answer": "Statelessness means the server does not store any client context or session state between requests. Every single HTTP request from the client must contain all the information necessary (e.g., JWT tokens in the header) for the server to understand and process it."
          },
          {
            "id": 20,
            "question": "What is Idempotency in API design? Which HTTP methods are idempotent?",
            "answer": "An operation is idempotent if making multiple identical requests has the same effect on the server state as making a single request. `GET`, `PUT`, `DELETE`, and `HEAD` are idempotent. `POST` is NOT idempotent, as calling it multiple times creates multiple resources."
          },
          {
            "id": 21,
            "question": "What is the difference between `PUT` and `PATCH`?",
            "answer": "`PUT` replaces the entire resource with the new payload (if you omit a field, it is set to null). `PATCH` applies partial modifications to a resource, updating only the specific fields provided in the payload."
          },
          {
            "id": 22,
            "question": "Explain CORS (Cross-Origin Resource Sharing). How did you handle it in Code Engine?",
            "answer": "CORS is a browser security feature that prevents a web page from making API requests to a different domain. I had to configure my Spring Boot backend (using `@CrossOrigin` or a global `WebMvcConfigurer`) to explicitly allow HTTP requests coming from the React frontend's origin (e.g., `http://localhost:5173`)."
          },
          {
            "id": 23,
            "question": "What are HTTP Status Codes? Explain the 200, 300, 400, and 500 blocks.",
            "answer": "- **2xx (Success):** 200 OK, 201 Created.\n- **3xx (Redirection):** 301 Moved Permanently, 304 Not Modified.\n- **4xx (Client Error):** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests.\n- **5xx (Server Error):** 500 Internal Server Error, 502 Bad Gateway, 504 Gateway Timeout."
          }
        ]
      },
      {
        "title": "Python, Pandas & Git/DevOps Tools",
        "questions": [
          {
            "id": 24,
            "question": "What is the Python GIL (Global Interpreter Lock)?",
            "answer": "The GIL is a mutex in CPython that allows only one thread to execute Python bytecodes at a time, preventing true parallel multithreading for CPU-bound tasks. This is why multi-processing (using `multiprocessing` module) or using asynchronous I/O (like `asyncio`) is preferred over multithreading in Python for performance."
          },
          {
            "id": 25,
            "question": "Why is Pandas so much faster than native Python loops for data manipulation?",
            "answer": "Pandas is built on top of NumPy, which is written in C. It uses **vectorization**, applying operations to entire arrays at once in optimized C code rather than looping through elements in Python, completely bypassing the Python interpreter's overhead."
          },
          {
            "id": 26,
            "question": "What happens internally when you use `git rebase` vs `git merge`?",
            "answer": "`git merge` takes two branches and ties their histories together with a new \"merge commit\", preserving the exact chronological history. `git rebase` takes your current branch's commits and replays them one-by-one on top of the target branch, creating a clean, linear history without a merge commit, but rewriting the commit hashes."
          },
          {
            "id": 27,
            "question": "Explain what a merge conflict is and how you resolve it.",
            "answer": "A conflict happens when two branches have changed the same line in a file, and Git cannot automatically determine which change to keep. I resolve it by opening the file, finding the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`), manually editing the file to keep the desired code, saving, and committing the resolution."
          },
          {
            "id": 28,
            "question": "How does Git track changes? What is the difference between the working directory, staging area, and repository?",
            "answer": "Git uses a snapshot-based system.\n- **Working Directory:** The actual files on your disk.\n- **Staging Area (Index):** A file that tracks the files you have `git add`ed, preparing them for the next commit.\n- **Repository (.git):** The database where Git permanently stores the committed snapshots (objects)."
          },
          {
            "id": 29,
            "question": "What is CI/CD (Continuous Integration / Continuous Deployment)?",
            "answer": "CI is the practice of automatically building and testing code (via tools like GitHub Actions) every time a commit is pushed to the repository. CD is the practice of automatically deploying the successfully tested code to staging or production environments, minimizing manual deployment errors."
          },
          {
            "id": 30,
            "question": "You mention A/B Testing and Scikit-learn. What is the difference between a Type I and Type II error in hypothesis testing?",
            "answer": "- **Type I Error (False Positive):** Rejecting the null hypothesis when it is actually true (e.g., concluding an ML model works better when it actually doesn't).\n- **Type II Error (False Negative):** Failing to reject the null hypothesis when it is actually false (e.g., failing to flag a user who is actually going to churn)."
          }
        ]
      }
    ]
  }
];