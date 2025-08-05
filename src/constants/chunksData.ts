export type ChunkPortalsDefinition = {
  // we define portals with local positions
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  chunkName?: string;
};

// export type BasicCutsceneInfo
export type ChunksData = Record<
  string,
  {
    chunkName: string;
    chunkXpos: number;
    chunkYpos: number;
    surroundingChunks: {
      /*
        o x o
        o q o
        o o o
        */
      top?: {
        chunkName: string;
        chunkXpos: number;
        chunkYpos: number;
      };
      /*
        o o o
        o q o
        o x o
        */
      bottom?: {
        chunkName: string;
        chunkXpos: number;
        chunkYpos: number;
      };
      /*
        o o o
        x q o
        o o o
        */
      left?: {
        chunkName: string;
        chunkXpos: number;
        chunkYpos: number;
      };
      /*
        o o o
        o q x
        o o o
        */
      right?: {
        chunkName: string;
        chunkXpos: number;
        chunkYpos: number;
      };
    };
    portals: ChunkPortalsDefinition[];
    // cutscenes:[]
  }
>;

export const initialChunkPos = "x1y1";
export const mapData: ChunksData = {
  x0y0: {
    chunkName: "test collections4-texture-baked",
    chunkXpos: 0,
    chunkYpos: 0,
    surroundingChunks: {
      top: {
        chunkName: "test collections2",
        chunkXpos: 0,
        chunkYpos: 1,
      },
      right: {
        chunkName: "test collections1",
        chunkXpos: 1,
        chunkYpos: 0,
      },
    },
    portals: [],
  },
  x1y0: {
    chunkName: "test collections4-texture-baked",
    chunkXpos: 0,
    chunkYpos: 0,
    surroundingChunks: {
      top: {
        chunkName: "test collections2",
        chunkXpos: 0,
        chunkYpos: 1,
      },
      right: {
        chunkName: "test collections1",
        chunkXpos: 1,
        chunkYpos: 0,
      },
    },
    portals: [],
  },
  x2y0: {
    chunkName: "test collections4-texture-baked",
    chunkXpos: 0,
    chunkYpos: 0,
    surroundingChunks: {
      top: {
        chunkName: "test collections2",
        chunkXpos: 0,
        chunkYpos: 1,
      },
      right: {
        chunkName: "test collections1",
        chunkXpos: 1,
        chunkYpos: 0,
      },
    },
    portals: [],
  },

  x0y1: {
    chunkName: "test collections4-texture-baked",
    chunkXpos: 0,
    chunkYpos: 0,
    surroundingChunks: {
      top: {
        chunkName: "test collections2",
        chunkXpos: 0,
        chunkYpos: 1,
      },
      right: {
        chunkName: "test collections1",
        chunkXpos: 1,
        chunkYpos: 0,
      },
    },
    portals: [],
  },
  x1y1: {
    chunkName: "test collections4-texture-baked",
    chunkXpos: 0,
    chunkYpos: 0,
    surroundingChunks: {
      top: {
        chunkName: "test collections2",
        chunkXpos: 0,
        chunkYpos: 1,
      },
      right: {
        chunkName: "test collections1",
        chunkXpos: 1,
        chunkYpos: 0,
      },
    },
    portals: [],
  },
  x2y1: {
    chunkName: "test collections4-texture-baked",
    chunkXpos: 0,
    chunkYpos: 0,
    surroundingChunks: {
      top: {
        chunkName: "test collections2",
        chunkXpos: 0,
        chunkYpos: 1,
      },
      right: {
        chunkName: "test collections1",
        chunkXpos: 1,
        chunkYpos: 0,
      },
    },
    portals: [],
  },

  x2y2: {
    chunkName: "test collections4-texture-baked",
    chunkXpos: 0,
    chunkYpos: 0,
    surroundingChunks: {
      top: {
        chunkName: "test collections2",
        chunkXpos: 0,
        chunkYpos: 1,
      },
      right: {
        chunkName: "test collections1",
        chunkXpos: 1,
        chunkYpos: 0,
      },
    },
    portals: [],
  },
  x0y2: {
    chunkName: "test collections4-texture-baked",
    chunkXpos: 0,
    chunkYpos: 0,
    surroundingChunks: {
      top: {
        chunkName: "test collections2",
        chunkXpos: 0,
        chunkYpos: 1,
      },
      right: {
        chunkName: "test collections1",
        chunkXpos: 1,
        chunkYpos: 0,
      },
    },
    portals: [],
  },
  x1y2: {
    chunkName: "test collections4-texture-baked",
    chunkXpos: 0,
    chunkYpos: 0,
    surroundingChunks: {
      top: {
        chunkName: "test collections2",
        chunkXpos: 0,
        chunkYpos: 1,
      },
      right: {
        chunkName: "test collections1",
        chunkXpos: 1,
        chunkYpos: 0,
      },
    },
    portals: [],
  },
};
