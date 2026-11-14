describe('sample assessment checks', () => {
  it('detects a normal metric range', () => {
    const result = {
      name: 'Heart Rate',
      value: 75,
      unit: 'bpm',
      healthyRange: [60, 90],
    };

    expect(result.healthyRange[0]).toBeLessThan(result.value);
    expect(result.healthyRange[1]).toBeGreaterThan(result.value);
  });
});
