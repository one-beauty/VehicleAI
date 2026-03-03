# Quick Reference Guide

## 4-Week Learning Plan Overview

| Week | Topic | Hours | Key Project | Success Metrics |
| :--- | :--- | :--- | :--- | :--- |
| Week 1 | Spring Boot Microservices | 20 | 10K QPS Gateway | Gateway: 10K+ QPS, P99 < 100ms |
| Week 2 | AI Engineering & RAG | 20 | Hybrid Search RAG | Recall: > 90%, Latency: < 1s |
| Week 3 | Cloud-Native & K8s | 20 | K8s Deployment | Availability: > 99.9% |
| Week 4 | Interview Prep | 20 | Mock Interviews | Score: > 80/100 |

## Key Technologies by Week

### Week 1: Spring Boot Microservices
- **Framework**: Spring Boot 3.x, Spring Cloud Gateway, WebFlux
- **Performance**: GraalVM, Virtual Threads, JVM Tuning
- **Caching**: Caffeine, Redis
- **Service Discovery**: Nacos
- **Circuit Breaking**: Sentinel
- **Target**: 10K QPS, P99 < 100ms

### Week 2: AI Engineering
- **Frameworks**: LangChain4j, Spring AI
- **Vector DB**: Milvus (< 100ms), PGVector, Elasticsearch
- **Retrieval**: Hybrid Search, RRF, Cohere Rerank
- **Memory**: Three-layer architecture (short/long/entity)
- **Target**: 90% recall, < 1s latency

### Week 3: Cloud-Native
- **Container**: Docker, multi-stage builds
- **Orchestration**: Kubernetes, YAML manifests
- **Service Mesh**: Istio, VirtualService, DestinationRule
- **Deployment**: Canary, Blue-Green
- **Monitoring**: Prometheus, Grafana, AlertManager
- **Logging**: ELK Stack
- **Target**: 99.9% availability

### Week 4: Interview Preparation
- **Communication**: English, STAR method
- **System Design**: Trade-offs, scalability
- **Mock Interviews**: 3+ sessions
- **Resume**: Quantified achievements
- **Target**: 80+ score

## High-Frequency Interview Topics

### Top 6 P0 Questions (Must Master)

| # | Question | Time | Key Points |
| :--- | :--- | :--- | :--- |
| 1 | 10K QPS Gateway | 10-15m | WebFlux, Virtual Thread, Multi-level Cache |
| 2 | Graceful Shutdown | 8-10m | K8s preStop, terminationGracePeriodSeconds |
| 3 | Virtual Threads | 10m | 1KB vs 1MB, 100M vs 1K concurrency |
| 4 | RAG System | 15-20m | Hybrid Retrieval, RRF, Rerank, 70%→90% |
| 5 | Multi-turn Agent | 12-15m | Three-layer Memory, Context Management |
| 6 | Vector DB Selection | 10-12m | Milvus < 100ms, PGVector 200-500ms |

### Performance Targets

| Component | Target | Verification |
| :--- | :--- | :--- |
| Gateway QPS | 10,000+ | Load test with Apache Bench |
| P99 Latency | < 100ms | Prometheus dashboard |
| RAG Recall | > 90% | Evaluation metrics |
| System Availability | > 99.9% | Uptime monitoring |
| Voice End-to-End | < 300ms | Performance profiling |
| Mock Interview | > 80/100 | Evaluation rubric |

## Daily Learning Schedule

### Week 1 Daily Plan
- **Day 1**: GraalVM + Virtual Threads (4h)
- **Day 2**: WebFlux + Spring Cloud Gateway (4h)
- **Day 3**: JVM Tuning + Caching (4h)
- **Day 4**: Nacos + Sentinel (4h)
- **Day 5**: Project Implementation (4h)

### Week 2 Daily Plan
- **Day 1**: Document Chunking + Milvus (4h)
- **Day 2**: Hybrid Retrieval + RRF (4h)
- **Day 3**: LangChain4j + Agent (4h)
- **Day 4**: Prompt Engineering (4h)
- **Day 5**: Project Implementation (4h)

### Week 3 Daily Plan
- **Day 1**: K8s Basics + Dockerfile (4h)
- **Day 2**: GPU Scheduling + HPA (4h)
- **Day 3**: Istio + Canary Deployment (4h)
- **Day 4**: Monitoring + Logging (4h)
- **Day 5**: Project Implementation (4h)

### Week 4 Daily Plan
- **Day 1**: Vehicle Voice Architecture (4h)
- **Day 2**: English Communication (4h)
- **Day 3**: Mock Interviews (4h)
- **Day 4**: Resume + Preparation (4h)
- **Day 5**: Final Review (4h)

## Code Snippets Quick Reference

### Spring Cloud Gateway with Virtual Threads
```java
@Configuration
public class GatewayConfig {
    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("voice-service", r -> r
                .path("/voice/**")
                .filters(f -> f.requestRateLimiter(c -> 
                    c.setRateLimiter(redisRateLimiter())))
                .uri("lb://voice-service"))
            .build();
    }
}
```

### Milvus Vector Search
```python
from pymilvus import Collection, connections

connections.connect("default", host="localhost", port="19530")
collection = Collection("voice_documents")
results = collection.search(
    query_vector, "embedding",
    search_params={"metric_type": "COSINE", "params": {"nprobe": 10}},
    limit=10
)
```

### Kubernetes Deployment with GPU
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-inference
spec:
  template:
    spec:
      containers:
      - name: llm
        resources:
          limits:
            nvidia.com/gpu: 1
```

### Istio Canary Deployment
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: voice-service
spec:
  http:
  - route:
    - destination:
        host: voice-service
        subset: v1
      weight: 90
    - destination:
        host: voice-service
        subset: v2
      weight: 10
```

## Interview Preparation Checklist

### Before Interview
- [ ] Mastered P0 questions (> 90%)
- [ ] Prepared 2-3 project descriptions (STAR method)
- [ ] English self-introduction (2-3 minutes)
- [ ] English project description (3-5 minutes)
- [ ] 3+ mock interviews completed
- [ ] Resume optimized with quantified achievements
- [ ] 3-5 reverse questions prepared
- [ ] Technical setup verified (for remote)

### During Interview
- [ ] Listen carefully to questions
- [ ] Think 3-5 seconds before answering
- [ ] Use structured explanation (First... Second... Finally...)
- [ ] Support with concrete examples
- [ ] Quantify achievements with numbers
- [ ] Maintain eye contact and smile
- [ ] Ask clarifying questions if needed

### After Interview
- [ ] Record feedback
- [ ] Identify improvement areas
- [ ] Practice weak areas
- [ ] Prepare for next round

## Common Mistakes to Avoid

| Mistake | Impact | Solution |
| :--- | :--- | :--- |
| Not understanding the question | High | Listen carefully, ask for clarification |
| Answer too long or too short | Medium | Practice structured explanation |
| No concrete examples | High | Prepare real project examples |
| No quantified data | Medium | Use numbers to support claims |
| Poor English pronunciation | Low | Practice daily, record yourself |
| Negative comments about previous company | High | Stay professional and positive |
| Lack of preparation | Critical | Follow 4-week curriculum strictly |

## Resources

### Official Documentation
- Spring Boot: https://spring.io/projects/spring-boot
- Kubernetes: https://kubernetes.io/docs/
- Istio: https://istio.io/latest/docs/
- Milvus: https://milvus.io/docs

### GitHub Repositories
- LangChain4j: https://github.com/langchain4j/langchain4j
- Spring AI: https://github.com/spring-projects/spring-ai
- vLLM: https://github.com/vllm-project/vllm

### Practice Platforms
- LeetCode: System Design problems
- HackerRank: Algorithm problems
- Mock Interview: Pramp, Interviewing.io

## Success Indicators

### Week 1 Success
- [ ] Gateway handles 10K+ QPS
- [ ] P99 latency < 100ms
- [ ] Cache hit rate > 80%
- [ ] Understand all concepts deeply

### Week 2 Success
- [ ] RAG system built and working
- [ ] Recall rate > 90%
- [ ] Multi-turn conversation works
- [ ] Can explain all components

### Week 3 Success
- [ ] Services deployed on K8s
- [ ] Istio routing works correctly
- [ ] Monitoring dashboard shows metrics
- [ ] Canary deployment successful

### Week 4 Success
- [ ] Mock interview score > 80/100
- [ ] English communication fluent
- [ ] Project descriptions clear and compelling
- [ ] Confident and ready for real interview

## Time Management Tips

1. **Stick to the schedule**: Don't skip or rush through weeks
2. **Code every day**: At least 2-3 hours of hands-on coding
3. **Review regularly**: Spend 30 minutes daily reviewing previous concepts
4. **Practice interviews**: Do mock interviews every 2-3 days in Week 4
5. **Get feedback**: Ask peers or mentors to review your progress
6. **Adjust as needed**: If struggling, spend extra time on that topic

## Final Tips for Success

1. **Deep understanding over breadth**: Master P0 questions deeply
2. **Real projects matter**: Build actual projects, not just read tutorials
3. **Practice communication**: Explain concepts to others
4. **Quantify everything**: Use numbers to demonstrate impact
5. **Stay confident**: You've prepared thoroughly
6. **Be authentic**: Show genuine interest in the role
7. **Follow up**: Send thank-you email after interview

---

*Last Updated: March 2, 2026*
