export const limitDataSize = (
    data: any,
    maxLength = 200,
    maxProps = 3,
    noTruncateKeys: string[] = []
  ): { data: any; isTruncated: boolean; fullData?: any } => {
    let isTruncated = false;
    let fullData: any;
  
    if (typeof data === "string") {
      if (data.length > maxLength) {
        isTruncated = true;
        fullData = data;
        data = data.substring(0, maxLength);
      }
      return { data, isTruncated, fullData };
    } else if (Array.isArray(data)) {
      if (data.length > maxProps) {
        isTruncated = true;
        fullData = data;
        data = data.slice(0, maxProps);
      }
      const result = [];
      for (let i = 0; i < data.length; i++) {
        const limited = limitDataSize(data[i], maxLength, maxProps, noTruncateKeys);
        if (limited.isTruncated) isTruncated = true;
        result.push(limited.data);
      }
      return { data: result, isTruncated, fullData: isTruncated ? fullData : undefined };
    } else if (typeof data === "object" && data !== null) {
      const limitedData: any = {};
      let count = 0;
      fullData = data;
      for (const key in data) {
        if (noTruncateKeys.includes(key)) {
          limitedData[key] = data[key];
          continue;
        }
        if (count >= maxProps) {
          isTruncated = true;
          break;
        }
        const limited = limitDataSize(data[key], maxLength, maxProps, noTruncateKeys);
        if (limited.isTruncated) isTruncated = true;
        limitedData[key] = limited.data;
        count++;
      }
      return { data: limitedData, isTruncated, fullData: isTruncated ? fullData : undefined };
    } else {
      return { data, isTruncated };
    }
  };
  