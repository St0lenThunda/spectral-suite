---
description: Analyze Lighthouse reports and suggest codebase improvements
---

# Improve Lighthouse Workflow

## 1. Locate and Parse Lighthouse Report
- Check for a `lighthouse-report.json` file in the project.
- If not found, ask the user to provide the path to the report.
- **CRITICAL**: Use the following Python command to parse key metrics without reading the entire file (which may be large):
  ```bash
  python3 -c "import json, sys; 
  try:
      with open(sys.argv[1]) as f: d = json.load(f); 
      print(f'Performance Score: {d.get(\"categories\", {}).get(\"performance\", {}).get(\"score\", 0) * 100}'); 
      print(\"\nMetrics:\"); 
      [print(f\" - {d[\"audits\"][k][\"title\"]}: {d[\"audits\"][k][\"displayValue\"]}\") for k in ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'] if k in d['audits']]; 
      print(\"\nTop Opportunities:\"); 
      opps = [a for a in d['audits'].values() if a.get('details', {}).get('type') == 'opportunity' and a.get('score') is not None and a.get('score', 1) < 1]; 
      opps.sort(key=lambda x: x.get('details', {}).get('overallSavingsMs', 0), reverse=True); 
      [print(f\" - {o[\"title\"]} ({o[\"displayValue\"]}): {o.get(\"description\", \"\").split(\".\")[0]}\") for o in opps[:5]];
  except Exception as e: print(f'Error parsing JSON: {e}')" [REPORT_PATH]
  ```

## 2. Analyze Opportunities
- Based on the metrics, identify the highest-impact bottlenecks.
- Locate relevant source files (large bundles, unoptimized assets, etc.).
- Focus on the top 1 or 2 items with the highest estimated savings.

## 3. Plan & Execute
- Create an implementation plan to address the bottlenecks.
- Propose changes (lazy loading, compression, etc.).
- Upon approval, apply the changes and verify the build.

## 4. Verify
- Run a new Lighthouse audit to confirm improvements.
- Document the results in a walkthrough or commit message.
