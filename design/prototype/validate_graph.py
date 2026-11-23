import sys, json, yaml, collections
p = sys.argv[1]
g = yaml.safe_load(open(p, encoding="utf-8"))
topics, subj_of, subjects, errs, warns = {}, {}, {}, [], []
order = g["core_path_subjects"]
for d in g["domains"]:
    for s in d["subjects"]:
        if s["id"] in subjects: errs.append(f"dup subject {s['id']}")
        s["_domain"] = d["id"]; subjects[s["id"]] = s
        for u in s["units"]:
            for line in u["topics"]:
                parts = [x.strip() for x in line.split("|")]
                if len(parts) != 3: errs.append(f"bad line {line}"); continue
                tid, title, pre = parts
                core = tid.startswith("*"); tid = tid.lstrip("*")
                if tid in topics: errs.append(f"dup topic {tid}")
                topics[tid] = dict(id=tid, title=title, core=core, pre=[x.strip() for x in pre.split(",") if x.strip()], subject=s["id"], unit=u["title"], domain=d["id"])
for sid in order:
    if sid not in subjects: errs.append(f"core order unknown subject {sid}")
for sid in subjects:
    if sid not in order: errs.append(f"subject {sid} missing from core order")
for t in topics.values():
    for q in t["pre"]:
        if q not in topics: errs.append(f"{t['id']} -> missing {q}")
# cycle detection (Kahn)
indeg = {k: 0 for k in topics}; out = collections.defaultdict(list)
for t in topics.values():
    for q in t["pre"]:
        if q in topics: out[q].append(t["id"]); indeg[t["id"]] += 1
qq = [k for k, v in indeg.items() if v == 0]; topo = []
while qq:
    n = qq.pop(); topo.append(n)
    for m in out[n]:
        indeg[m] -= 1
        if indeg[m] == 0: qq.append(m)
if len(topo) != len(topics): errs.append(f"CYCLE among {[k for k,v in indeg.items() if v>0]}")
# core closure + order
pos = {s: i for i, s in enumerate(order)}
for t in topics.values():
    if not t["core"]: continue
    for q in t["pre"]:
        if q not in topics: continue
        qt = topics[q]
        if not qt["core"]: errs.append(f"core {t['id']} needs non-core {q}")
        elif pos[qt["subject"]] > pos[t["subject"]]: errs.append(f"core {t['id']} ({t['subject']}) needs later {q} ({qt['subject']})")
# roots
roots = [t["id"] for t in topics.values() if not t["pre"]]
# redundant edges (transitive)
anc = {}
for n in topo:
    a = set()
    for q in topics[n]["pre"]:
        a |= {q} | anc[q]
    anc[n] = a
red = []
for t in topics.values():
    for q in t["pre"]:
        others = [r for r in t["pre"] if r != q]
        if any(q in anc[r] for r in others): red.append(f"{t['id']}: {q}")
# depth
depth = {}
for n in topo:
    depth[n] = 1 + max([depth[q] for q in topics[n]["pre"]], default=0)
# subject deps
sdeps = collections.defaultdict(set)
for t in topics.values():
    for q in t["pre"]:
        if q in topics and topics[q]["subject"] != t["subject"]:
            sdeps[t["subject"]].add(topics[q]["subject"])
# subject cycle?
sind = {s: 0 for s in subjects}; sout = collections.defaultdict(list)
for s, ds in sdeps.items():
    for d in ds: sout[d].append(s); sind[s] += 1
st = [s for s, v in sind.items() if v == 0]; cnt = 0
while st:
    n = st.pop(); cnt += 1
    for m in sout[n]:
        sind[m] -= 1
        if sind[m] == 0: st.append(m)
if cnt != len(subjects): warns.append("subject-level graph has cycles (expected: allowed; topic DAG is authoritative): " + str([s for s,v in sind.items() if v>0]))
cross = sum(1 for t in topics.values() for q in t["pre"] if q in topics and topics[q]["subject"] != t["subject"])
edges = sum(len(t["pre"]) for t in topics.values())
print(json.dumps(dict(domains=len(g["domains"]), subjects=len(subjects), topics=len(topics), core=sum(t["core"] for t in topics.values()), edges=edges, cross_subject_edges=cross, roots=roots, max_depth=max(depth.values()), errors=len(errs), redundant=len(red)), indent=1))
for e in errs: print("ERR", e)
for w in warns: print("WARN", w)
for r in red: print("REDUNDANT", r)
json.dump(dict(topics=topics, depth=depth, sdeps={k: sorted(v) for k, v in sdeps.items()}, order=order, subjects={k: dict(title=v["title"], tier=v["tier"], domain=v["_domain"], boss=v["boss"], refs=v["refs"]) for k, v in subjects.items()}, domains=[dict(id=d["id"], title=d["title"], tagline=d["tagline"], color=d["color"], subjects=[s["id"] for s in d["subjects"]]) for d in g["domains"]]), open(sys.argv[2] if len(sys.argv) > 2 else "graph.json", "w"), indent=0)
sys.exit(1 if errs else 0)
