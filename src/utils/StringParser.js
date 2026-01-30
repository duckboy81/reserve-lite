export const StringParser = {
  FLIGHT_REGEX: /(\d{4})\/(\d{4})\s+([A-Z0-9]+)/,
  GROUND_REGEX: /-\s*([A-Z]{3})\+(\d+(\.\d+)?)Huber/i,
  HUB_SPLIT_REGEX: /\s+-\s+([A-Z]{3})\s+-\s+/,

  parseSegmentString: (segStr) => {
    if (!segStr) return null;
    const cleanStr = segStr.trim();
    let ground = null;
    let flightPart = cleanStr;
    const groundMatch = cleanStr.match(StringParser.GROUND_REGEX);
    if (groundMatch) {
      flightPart = cleanStr.replace(groundMatch[0], '').trim();
      ground = { hub: groundMatch[1], duration: `${groundMatch[2]}h`, mode: 'Uber' };
    }
    const flightMatch = flightPart.match(StringParser.FLIGHT_REGEX);
    if (flightMatch) {
      const depRaw = flightMatch[1];
      const arrRaw = flightMatch[2];
      const flightNum = flightMatch[3];
      return {
        flight: flightNum,
        dep: `${depRaw.substring(0,2)}:${depRaw.substring(2,4)}`,
        arr: `${arrRaw.substring(0,2)}:${arrRaw.substring(2,4)}`,
        status: 'Unknown',
        ground
      };
    }
    return null;
  },

  processRowOptions: (optionStrings) => {
    const finalOptions = [];
    const parseSelfContained = (str) => {
      const match = str.match(StringParser.HUB_SPLIT_REGEX);
      if (match) {
        const hub = match[1];
        const parts = str.split(match[0]);
        const inboundSeg = StringParser.parseSegmentString(parts[0]);
        const outboundSeg = StringParser.parseSegmentString(parts[1]);
        if (inboundSeg && outboundSeg) {
          return {
            type: 'hub-strategy',
            hub,
            label: `${hub} Strategy`,
            inbound: [inboundSeg],
            outbound: [{ ...outboundSeg, isPrimary: true }],
          };
        }
      }
      return null;
    };

    optionStrings.forEach((optStr) => {
      if (!optStr) return;
      const str = optStr.trim();
      const complex = parseSelfContained(str);
      if (complex) { finalOptions.push(complex); return; }
      const simple = StringParser.parseSegmentString(str);
      if (simple) {
        finalOptions.push({
          type: 'direct',
          segments: [simple],
          finalArr: simple.arr,
          label: simple.ground ? `Via ${simple.ground.hub}` : undefined,
        });
      }
    });
    return finalOptions;
  },

  seedFromCSV: (csvDataMap) => {
    const parsedData = {};
    Object.keys(csvDataMap).forEach(airport => {
      const text = csvDataMap[airport];
      const lines = text.trim().split('\n');
      const airportRows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 4) continue;
        const date = cols[0];
        const callET = cols[1].substring(0, 5);
        const options = StringParser.processRowOptions(cols.slice(3));
        if (options.length > 0) {
          const key = `${date}T${callET}`;
          airportRows.push({ key, date, callET, options });
        }
      }
      parsedData[airport] = airportRows;
    });
    return parsedData;
  }
};
