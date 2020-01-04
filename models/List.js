const mongoose = require('mongoose')
const mongoosastic = require('mongoosastic')

const ListSchema = mongoose.Schema({
    accoladesYear: { type: String, es_indexed: true },
    authorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', es_indexed: false }],
    date: { type: Date, default: Date.now, es_indexed: false },
    dateBasedAccolades: { type: Boolean, default: false, es_indexed: false },
    description: { type: String, es_indexed: true },
    groupName: { type: String, es_indexed: false },
    imagePath: { type: String , es_indexed: false },
    isDeleted: { type: Boolean, default: false, es_indexed: false },
    isPrivate: { type: Boolean, default: false, es_indexed: false },
    placeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Place', es_indexed: false }],
    subscriberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', es_indexed: false }],
    title: { type: String, required: true, es_indexed: true }
}, {
    id: false,
    timestamps: true
})

ListSchema.virtual('authors', {
    ref: 'User',
    localField: 'authorIds',
    foreignField: '_id'
})

ListSchema.virtual('places', {
    ref: 'Place',
    localField: 'placeIds',
    foreignField: '_id'
})

ListSchema.virtual('subscribers', {
    ref: 'User',
    localField: 'subscriberIds',
    foreignField: '_id'
})

ListSchema.set('toObject', { virtuals: true })
ListSchema.set('toJSON', { virtuals: true })

ListSchema.plugin(mongoosastic, { hosts: [process.env.BONSAI_URL] })
mongoose.model('List', ListSchema).createMapping(function(err, mapping) {
    if (err) {
      console.log('error creating mapping (you can safely ignore this)')
      console.log(err)
    } else {
      console.log('mapping created!')
      console.log(mapping)
    }
})
mongoose.model('List', ListSchema).synchronize()

module.exports = mongoose.model('List', ListSchema)