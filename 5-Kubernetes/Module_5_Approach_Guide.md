# Module 5 Approach Guide — Kubernetes

## Module Overview

```mermaid
mindmap
  root((Module 5: Kubernetes))
    5.1 Architecture
      Components & Control Plane
      Cluster Setup: kubeadm, Kind
      Cluster Upgrade Process
    5.2 Workloads
      Pod Fundamentals & Lifecycle
      Native Sidecar Containers
      Deployments, StatefulSets, DaemonSets
      Scheduling, Taints, Affinity
      Pod Priority & Preemption
    5.3 Networking
      Services: ClusterIP, NodePort, LB
      Ingress & Gateway API
      cert-manager TLS Automation
      Network Policies
      CoreDNS
    5.4 Storage
      emptyDir, hostPath
      PV, PVC, StorageClasses
    5.5 Configuration & Scaling
      ConfigMaps & Secrets
      HPA, VPA, Cluster Autoscaler
      KEDA Event-Driven Autoscaling
    5.6 Packaging
      Kustomize
      Helm Charts
    5.7 Security
      Authentication
      RBAC
      Admission Controllers
      CRDs & Operator Pattern
    5.8 Operations
      Troubleshooting Control Plane
      Troubleshooting Pods
      Monitoring: Prometheus/Grafana
      GPU Nodes & NVIDIA Device Plugin
      Dashboard & k9s
      kubectl Cheatsheet
    5.9 High Availability & Disaster Recovery
      Multi-Master HA
      etcd Backup & Restore
    5.10 CKA Exam Prep
      50 Pattern Questions
      Exam-Day Cheatsheet
```

---

## Who Is This Module For?

Kubernetes is the **operating system of the cloud**. This is the largest and most critical module in the course. It covers everything from architecture to troubleshooting — the same scope as the CKA exam.

**Target audience:**
- Engineers preparing for CKA, CKAD, or CKS certifications
- DevOps engineers deploying and managing Kubernetes clusters
- Platform engineers building internal developer platforms on Kubernetes

---

## Prerequisites

| Prerequisite | Required? | Notes |
|---|---|---|
| Module 1 (Linux) completed | **Yes** | K8s nodes are Linux machines; you'll SSH into them, read logs, manage processes |
| Module 2 (Networking) completed | **Yes** | Services, Ingress, Network Policies — all networking |
| Module 3 (Shell Scripting) completed | Recommended | kubectl commands in scripts, init containers |
| Module 4 (Docker) completed | **Yes** | Pods run containers; you must understand images, networking, volumes |
| `kubectl` installed | **Yes** | `curl -LO https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl` |
| A cluster (Kind or Minikube) | **Yes** | `kind create cluster --name lab` is sufficient for most exercises |

---

## How to Approach This Module

```mermaid
flowchart TD
    A[Start Module 5] --> B["5.1 — Architecture & Setup<br/>Understand what a cluster is"]
    B --> C["5.2 — Workloads<br/>Pods, Deployments, Scheduling"]
    C --> D["5.3 — Networking<br/>Services, Ingress, DNS, Policies"]
    D --> E["5.4–5.5 — Storage & Config<br/>PVs, ConfigMaps, Secrets, Autoscaling"]
    E --> F["5.6 — Packaging<br/>Kustomize & Helm"]
    F --> G["5.7 — Security<br/>Auth, RBAC, Admission"]
    G --> H["5.8 — Operations<br/>Troubleshooting, Monitoring, GPU nodes"]
    H --> HA["5.9 — HA & DR<br/>Multi-master, etcd backup, recovery"]
    HA --> I[Module 5 Complete ✅]

    style A fill:#4CAF50,color:#fff
    style I fill:#2196F3,color:#fff
```

### Study Strategy

1. **This module is a marathon, not a sprint** — Budget 4–6 weeks. Don't rush.
2. **Use a real cluster for every exercise** — Kind is free and takes 30 seconds to create.
3. **Master `kubectl explain`** — It's the built-in documentation: `kubectl explain pod.spec.containers`.
4. **Build YAML from scratch** — Never copy-paste from docs. Type it yourself.
5. **Break things constantly** — Start with pods, services, and RBAC before touching etcd recovery.
6. **Subchapter 5.8 is the daily-ops center** — Troubleshooting skills separate juniors from seniors.

### Reading Order

The subchapters are designed to be read in order, but you can group them into three phases:

> **First-time learner path:** HA and etcd backup now come after daily Kubernetes operations. Do not rush into multi-master recovery until Pods, Services, Storage, RBAC, and troubleshooting feel familiar.

| Phase | Subchapters | Focus |
|---|---|---|
| **Phase 1: Foundations** | 5.1, 5.2 | "What is a cluster and how do workloads run?" |
| **Phase 2: Application Platform** | 5.3, 5.4, 5.5, 5.6 | "How do workloads communicate, persist data, scale, and ship?" |
| **Phase 3: Production Operations** | 5.7, 5.8, 5.9 | "How do I secure, operate, and recover a cluster?" |
| **Phase 4: Exam Prep** | 5.10 | "Can I solve exam-style tasks in under 5 minutes?" |

---

## Time Estimates

| Subchapter | Reading | Practice | Total |
|---|---|---|---|
| 5.1 Architecture | 2 hrs | 2 hrs | **4 hrs** |
| 5.2 Workloads | 3 hrs | 4 hrs | **7 hrs** |
| 5.3 Networking | 3 hrs | 4 hrs | **7 hrs** |
| 5.4 Storage | 2 hrs | 2 hrs | **4 hrs** |
| 5.5 Config & Scaling | 2 hrs | 2 hrs | **4 hrs** |
| 5.6 Packaging | 2.5 hrs | 3 hrs | **5.5 hrs** |
| 5.7 Security | 2.5 hrs | 3 hrs | **5.5 hrs** |
| 5.8 Operations + GPU Nodes | 3.5 hrs | 5 hrs | **8.5 hrs** |
| 5.9 HA & Disaster Recovery | 2.5 hrs | 3 hrs | **5.5 hrs** |
| 5.10 CKA Exam Prep (50 Qs) | 1 hr | 5 hrs | **6 hrs** |
| **Total** | **23 hrs** | **32 hrs** | **~55 hrs** |

> **Realistic timeline:** 4–6 weeks at 2–3 hours/day. This is the biggest module for a reason — Kubernetes IS the job.

---

## Practice Lab Ideas

| Lab | Covers | Difficulty |
|---|---|---|
| Deploy a 3-replica Nginx deployment with a NodePort service, test with curl | 5.2, 5.3 | ⭐⭐ |
| Create a StatefulSet with persistent volumes for PostgreSQL | 5.2, 5.4 | ⭐⭐⭐ |
| Set up Ingress with TLS termination using cert-manager | 5.3 | ⭐⭐⭐ |
| Write a Network Policy that allows frontend→backend but blocks backend→frontend | 5.3 | ⭐⭐⭐ |
| Build a Helm chart for a microservice with values for dev/staging/prod | 5.6 | ⭐⭐⭐⭐ |
| Configure RBAC: developer role (read pods, exec), deployer role (apply manifests) | 5.7 | ⭐⭐⭐⭐ |
| Troubleshoot: pod stuck in CrashLoopBackOff, ImagePullBackOff, Pending — find root cause | 5.8 | ⭐⭐⭐⭐⭐ |
| Back up etcd, delete a namespace, restore from backup | 5.9 | ⭐⭐⭐⭐⭐ |

---

## What Success Looks Like

By the end of Module 5, you should be able to:

- [ ] Draw the Kubernetes architecture from memory (API server, etcd, scheduler, kubelet, kube-proxy)
- [ ] Deploy any workload type: Deployment, StatefulSet, DaemonSet, Job, CronJob
- [ ] Configure Services, Ingress, and Network Policies for a multi-tier application
- [ ] Manage persistent storage with PVs, PVCs, and StorageClasses
- [ ] Use ConfigMaps, Secrets, and HPA for configuration and scaling
- [ ] Package applications with Helm and Kustomize
- [ ] Secure a cluster with RBAC and admission controllers
- [ ] Troubleshoot any pod state (Pending, CrashLoopBackOff, ImagePullBackOff, OOMKilled)
- [ ] Monitor clusters with Prometheus and Grafana
- [ ] Explain when HA control planes and etcd backups matter, and restore a kubeadm cluster from a tested snapshot

---

## Connection to Other Modules

```mermaid
flowchart LR
    M1[Module 1: Linux] --> M5[Module 5: Kubernetes]
    M2[Module 2: Networking] --> M5
    M4[Module 4: Docker] --> M5
    M5 --> M7["Module 7: Nginx<br/>(Ingress Controller)"]
    M5 --> M8["Module 8: CI/CD<br/>(deploy to K8s)"]
    M5 --> M10["Module 10: GitOps<br/>(ArgoCD on K8s)"]

    style M5 fill:#4CAF50,color:#fff
```

**Kubernetes is the convergence point.** Linux runs the nodes, Docker builds the images, networking connects the pods, CI/CD deploys the manifests, Nginx serves as the ingress controller, and ArgoCD syncs the desired state from Git.

> **Next module:** [Module 6 — Git](../6-Git/Module_6_Approach_Guide.md)
